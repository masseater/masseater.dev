import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import {
  Array,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  pipe,
  Predicate,
  Result,
  Schema,
} from "effect";
import { Base64 } from "effect/encoding";
import { SqlClient } from "effect/sql";

import { RENDER, databaseLayer } from "#shared/database";
import { Settings } from "#shared/settings";
import { decodeRows, firstId } from "#shared/sql";

import { readModel, readModelPart } from "./read-model.ts";
import { failRender, putRender, renderJobs } from "./render-jobs.ts";

const NO_SIZE = 0;
const FIRST = 0;
const MANY_FAILURES = 12;
const LARGE_MODEL = 9_437_184;
const MODEL_BYTE = 7;
const TEXTURE = "wall.png";
const MATERIAL = "wall.mtl";
const OUTSIDE = "../secret.png";
const pngFromBase64 = (base64: string): Uint8Array => Result.getOrThrow(Base64.decode(base64));

const RED_PIXEL = pngFromBase64(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4z8AAAAMBAQCc479ZAAAAAElFTkSuQmCC",
);

const StateRow = Schema.Struct({ render: Schema.Int, images: Schema.Int });

const dataInTemporaryFolder = Layer.unwrap(
  Effect.gen(function* dataInTemporaryFolder() {
    const fileSystem = yield* FileSystem.FileSystem;
    const dataDirectory = yield* fileSystem.makeTempDirectoryScoped();
    const settings = Layer.succeed(Settings, {
      dataDirectory,
      modelDirectory: Option.none<string>(),
      embedderWorker: new URL("file:///unused"),
    });
    return databaseLayer.pipe(Layer.provide(settings));
  }),
).pipe(Layer.provideMerge(NodeServices.layer));

const writeModelFolder = Effect.fn("writeModelFolder")(function* writeModelFolder(
  model: Uint8Array,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const folder = yield* fileSystem.makeTempDirectoryScoped();
  const file = path.join(folder, "wall.obj");
  yield* fileSystem.writeFile(file, model);
  yield* fileSystem.writeFileString(path.join(folder, MATERIAL), `map_Kd ${TEXTURE}\n`);
  yield* fileSystem.writeFile(path.join(folder, TEXTURE), RED_PIXEL);
  yield* fileSystem.writeFile(path.join(path.dirname(folder), "secret.png"), RED_PIXEL);
  return { folder, file };
});

const addModel = Effect.fn("addModel")(function* addModel(model: Uint8Array) {
  const sql = yield* SqlClient.SqlClient;
  const { folder, file } = yield* writeModelFolder(model);
  yield* sql`insert into sources(path, kind) values (${folder}, 'folder')`;
  const packageId = yield* firstId(
    sql`insert into packages(source_id, kind, path, name, size, modified_at, summary)
      select id, 'loose', ${file}, 'wall', ${NO_SIZE}, ${NO_SIZE}, '{}'
      from sources where path = ${folder} returning id`,
  );
  return yield* firstId(
    sql`insert into assets(package_id, guid, pathname, kind, text, file, render)
      values (${packageId}, 'wall.obj', 'wall.obj', 'model', 'wall', ${file}, ${RENDER.pending})
      returning id`,
  );
});

const objModel = new TextEncoder().encode(`mtllib ${MATERIAL}\nv 0 0 0\n`);

const listed = Effect.map(
  renderJobs(),
  Array.map(({ assetId }) => assetId),
);

const makeRetriesDue = Effect.gen(function* makeRetriesDue() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`update assets set render_retry_at = 0`;
});

const stateOf = Effect.fn("stateOf")(function* stateOf(assetId: number) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(StateRow)(
    sql`select render, (select count(*) from images where asset_id = a.id) as images
      from assets a where id = ${assetId}`,
  );
  return yield* Effect.fromOption(Array.head(rows));
});

const twoParts = Effect.fn("twoParts")(function* twoParts(assetId: number) {
  const file = Option.getOrNull(Option.none<string>());
  const { data: first } = yield* readModelPart({ assetId, file, offset: FIRST });
  const { data: second } = yield* readModelPart({ assetId, file, offset: first.length });
  const end = first.length + second.length;
  const { data: rest } = yield* readModelPart({ assetId, file, offset: end });
  const joined = yield* Effect.promise(() =>
    new Blob([Uint8Array.from(first), Uint8Array.from(second)]).arrayBuffer(),
  );
  return { joined: new Uint8Array(joined), rest: rest.length };
});

layer(dataInTemporaryFolder, { excludeTestServices: true })("render jobs", (it) => {
  it.effect("描画に何度失敗しても打ち切らず、待ち時間のあとでまた描画を頼む", () =>
    Effect.gen(function* neverGivesUp() {
      const assetId = yield* addModel(objModel);
      const first = yield* listed;
      yield* failRender({ assetId, reason: "WebGL context lost" });
      const postponed = yield* listed;
      const relisted = yield* pipe(
        Effect.andThen(failRender({ assetId, reason: "WebGL context lost" }), makeRetriesDue),
        Effect.andThen(listed),
        Effect.replicateEffect(MANY_FAILURES),
      );
      const state = yield* stateOf(assetId);
      expect(first).toStrictEqual([assetId]);
      expect(postponed).toStrictEqual([]);
      expect(relisted).toStrictEqual(Array.replicate([assetId], MANY_FAILURES));
      expect(state).toStrictEqual({ render: RENDER.pending, images: FIRST });
    }),
  );

  it.effect("壊れた画像の描画は受け取らず、アセットを描画待ちのまま残す", () =>
    Effect.gen(function* rejectsBrokenImages() {
      const assetId = yield* addModel(objModel);
      const rejected = yield* putRender({ assetId, pngs: [new Uint8Array([MODEL_BYTE])] }).pipe(
        Effect.flip,
      );
      const state = yield* stateOf(assetId);
      expect(Predicate.isTagged(rejected, "PreviewFailed")).toBe(true);
      expect(state).toStrictEqual({ render: RENDER.pending, images: FIRST });
      yield* putRender({ assetId, pngs: [RED_PIXEL] });
      const stored = yield* stateOf(assetId);
      expect(stored).toStrictEqual({ render: RENDER.done, images: 1 });
    }),
  );
});

layer(dataInTemporaryFolder, { excludeTestServices: true })("model reads", (it) => {
  it.effect("大きいモデルも分けて読み、元と同じバイト列に戻せる", () =>
    Effect.gen(function* readsLargeModel() {
      const model = new Uint8Array(LARGE_MODEL).fill(MODEL_BYTE);
      model.set(objModel);
      const assetId = yield* addModel(model);
      const { size, files } = yield* readModel(assetId);
      const { joined, rest } = yield* twoParts(assetId);
      const { data: texture } = yield* readModelPart({ assetId, file: TEXTURE, offset: FIRST });
      const names = pipe(
        files,
        Array.map(({ name }) => name),
      );
      expect({ size, rest, texture, names: new Set(names) }).toStrictEqual({
        size: LARGE_MODEL,
        rest: FIRST,
        texture: RED_PIXEL,
        names: new Set([MATERIAL, TEXTURE]),
      });
      expect(joined).toStrictEqual(model);
    }),
  );

  it.effect("モデルのフォルダの外のファイルは読ませない", () =>
    Effect.gen(function* refusesOutside() {
      const assetId = yield* addModel(objModel);
      const refused = yield* readModelPart({ assetId, file: OUTSIDE, offset: FIRST }).pipe(
        Effect.flip,
      );
      expect(Predicate.isTagged(refused, "NotACompanion")).toBe(true);
    }),
  );
});
