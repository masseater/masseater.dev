import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Array, Effect, FileSystem, Layer, Option, Path, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { databaseLayer } from "#shared/database";
import { Embedder } from "#shared/embedding";
import { Settings } from "#shared/settings";
import { decodeRows, firstId } from "#shared/sql";
import { writePackage } from "#shared/unitypackage";
import type { LooseFile } from "#shared/unitypackage";

import { scanFolders } from "./scan-folders.ts";

const VECTOR_DIMENSIONS = 768;
const UNIT = 1;
const LARGE_ASSET_BYTES = 2_097_153;
const PACKAGE = "Cabin.unitypackage";

const TEXTURE: LooseFile = {
  guid: "0123456789abcdef0123456789abcdef",
  pathname: "Assets/Cabin/Textures/wall.png",
  data: new TextEncoder().encode("png"),
};

const MODEL: LooseFile = {
  guid: "fedcba9876543210fedcba9876543210",
  pathname: "Assets/Cabin/Models/cabin.fbx",
  data: new Uint8Array(LARGE_ASSET_BYTES),
};

const VECTOR = Array.makeBy(VECTOR_DIMENSIONS, () => UNIT);

const PathRow = Schema.Struct({ path: Schema.String });

const vectorsFor = (inputs: readonly unknown[]): Effect.Effect<readonly (readonly number[])[]> =>
  Effect.succeed(
    pipe(
      inputs,
      Array.map(() => VECTOR),
    ),
  );

const embedderLayer = Layer.succeed(
  Embedder,
  Embedder.of({
    device: "test",
    embedQuery: () => Effect.succeed(VECTOR),
    embedDocuments: vectorsFor,
    embedImages: vectorsFor,
  }),
);

const indexInTemporaryFolder = Layer.unwrap(
  Effect.gen(function* indexInTemporaryFolder() {
    const fileSystem = yield* FileSystem.FileSystem;
    const dataDirectory = yield* fileSystem.makeTempDirectoryScoped();
    const settings = Layer.succeed(Settings, {
      dataDirectory,
      modelDirectory: Option.none<string>(),
      embedderWorker: new URL("file:///unused"),
    });
    return Layer.merge(databaseLayer.pipe(Layer.provide(settings)), embedderLayer);
  }),
).pipe(Layer.provideMerge(NodeServices.layer));

const addSource = Effect.fn("addSource")(function* addFolderSource(files: readonly LooseFile[]) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sql = yield* SqlClient.SqlClient;
  const folder = yield* fileSystem.makeTempDirectoryScoped();
  const file = path.join(folder, PACKAGE);
  yield* writePackage([], files, file);
  const id = yield* firstId(
    sql`insert into sources(path, kind) values (${folder}, 'folder') returning id`,
  );
  return { id, folder, file };
});

const scan = scanFolders(
  () => Effect.void,
  () => false,
);

const packagePaths = Effect.fn("packagePaths")(function* packagePathsOf(sourceId: number) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(PathRow)(
    sql`select path from packages where source_id = ${sourceId} order by path`,
  );
  return pipe(
    rows,
    Array.map(({ path }) => path),
  );
});

const assetPathnames = Effect.fn("assetPathnames")(function* assetPathnamesOf(sourceId: number) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(PathRow)(
    sql`select a.pathname as path from assets a join packages p on p.id = a.package_id
      where p.source_id = ${sourceId} order by a.pathname`,
  );
  return pipe(
    rows,
    Array.map(({ path }) => path),
  );
});

layer(indexInTemporaryFolder, { excludeTestServices: true })("scanFolders", (it) => {
  it.effect("ファイルが消えたパッケージを索引から消す", () =>
    Effect.gen(function* removesMissing() {
      const fileSystem = yield* FileSystem.FileSystem;
      const { id, file } = yield* addSource([TEXTURE]);
      yield* scan;
      const indexed = yield* packagePaths(id);
      expect(indexed).toStrictEqual([file]);
      yield* fileSystem.remove(file);
      yield* scan;
      const remaining = yield* Effect.all([packagePaths(id), assetPathnames(id)]);
      expect(remaining).toStrictEqual([[], []]);
    }).pipe(Effect.scoped),
  );

  it.effect("中身を読み込まない大きさのアセットも索引に入れる", () =>
    Effect.gen(function* indexesLarge() {
      const { id } = yield* addSource([TEXTURE, MODEL]);
      yield* scan;
      const assets = yield* assetPathnames(id);
      expect(assets).toStrictEqual([MODEL.pathname, TEXTURE.pathname]);
    }).pipe(Effect.scoped),
  );
});

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "scanFolders with an unreadable folder",
  (it) => {
    it.effect("一覧を読めないフォルダのパッケージは索引に残す", () =>
      Effect.gen(function* keepsUnreadable() {
        const fileSystem = yield* FileSystem.FileSystem;
        const { id, folder, file } = yield* addSource([TEXTURE]);
        yield* scan;
        yield* fileSystem.remove(folder, { recursive: true });
        yield* scan;
        const kept = yield* Effect.all([packagePaths(id), assetPathnames(id)]);
        expect(kept).toStrictEqual([[file], [TEXTURE.pathname]]);
      }).pipe(Effect.scoped),
    );

    it.effect("読めたフォルダだけを突き合わせ、読めないフォルダには触れない", () =>
      Effect.gen(function* reconcilesReadable() {
        const fileSystem = yield* FileSystem.FileSystem;
        const readable = yield* addSource([TEXTURE]);
        const unreadable = yield* addSource([TEXTURE]);
        yield* scan;
        yield* fileSystem.remove(readable.file);
        yield* fileSystem.remove(unreadable.folder, { recursive: true });
        yield* scan;
        const packages = yield* Effect.all([
          packagePaths(readable.id),
          packagePaths(unreadable.id),
        ]);
        expect(packages).toStrictEqual([[], [unreadable.file]]);
      }).pipe(Effect.scoped),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "scanFolders with a vanished file",
  (it) => {
    it.effect("stat できないファイルを飛ばし、同じフォルダの残りを索引する", () =>
      Effect.gen(function* skipsVanished() {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const { id, folder, file } = yield* addSource([TEXTURE]);
        yield* fileSystem.symlink(
          path.join(folder, "missing.unitypackage"),
          path.join(folder, "Ghost.unitypackage"),
        );
        yield* scan;
        const packages = yield* packagePaths(id);
        expect(packages).toStrictEqual([file]);
      }).pipe(Effect.scoped),
    );
  },
);
