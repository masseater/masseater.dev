import { NodeServices } from "@effect/platform-node";
import { Array, Effect, FileSystem, Layer, Option, Path, Ref, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { databaseLayer } from "#shared/database";
import { Embedder } from "#shared/embedding";
import { Settings } from "#shared/settings";
import { decodeRows, firstId } from "#shared/sql";
import { writePackage } from "#shared/unitypackage";
import type { LooseFile } from "#shared/unitypackage";

const VECTOR_DIMENSIONS = 768;
const UNIT = 1;
const NO_SIZE = 0;
const LIBRARY = "/library";
const PACKAGE = "/library/Cabin.unitypackage";

const VECTOR = Array.makeBy(VECTOR_DIMENSIONS, () => UNIT);

const CountRow = Schema.Struct({ total: Schema.Int });

const StateRow = Schema.Struct({ embedded: Schema.Int });

const vectorsFor = (inputs: readonly unknown[]): Effect.Effect<readonly (readonly number[])[]> =>
  Effect.succeed(
    pipe(
      inputs,
      Array.map(() => VECTOR),
    ),
  );

const embedderOf = (overrides: Partial<typeof Embedder.Service>): typeof Embedder.Service =>
  Embedder.of({
    device: "test",
    embedQuery: () => Effect.succeed(VECTOR),
    embedDocuments: vectorsFor,
    embedImages: vectorsFor,
    ...overrides,
  });

const recordingEmbedder = Effect.gen(function* recordingEmbedder() {
  const texts = yield* Ref.make<readonly string[]>([]);
  const embedder = embedderOf({
    embedDocuments: (batch) =>
      Ref.update(texts, Array.appendAll(batch)).pipe(Effect.andThen(vectorsFor(batch))),
  });
  return { embedder, texts: Ref.get(texts) };
});

/** @internal */
const indexInTemporaryFolder = Layer.unwrap(
  Effect.gen(function* indexInTemporaryFolder() {
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

/** @internal */
const addPackage = Effect.gen(function* addPackage() {
  const sql = yield* SqlClient.SqlClient;
  const sourceId = yield* firstId(
    sql`insert into sources(path, kind) values (${LIBRARY}, 'folder') returning id`,
  );
  return yield* firstId(
    sql`insert into packages(source_id, kind, path, name, size, modified_at, summary)
      values (${sourceId}, 'unitypackage', ${PACKAGE}, 'Cabin', ${NO_SIZE}, ${NO_SIZE}, '{}')
      returning id`,
  );
});

const addImage = Effect.fn("addImage")(function* addImageOfNewAsset(
  packageId: number,
  png: Uint8Array,
  index: number,
) {
  const sql = yield* SqlClient.SqlClient;
  const name = index.toString();
  const assetId = yield* firstId(
    sql`insert into assets(package_id, guid, pathname, kind, text)
      values (${packageId}, ${name}, ${`Assets/${name}.png`}, 'texture', ${name}) returning id`,
  );
  return yield* firstId(
    sql`insert into images(asset_id, png) values (${assetId}, ${png}) returning id`,
  );
});

/** @internal */
const addImages = Effect.fn("addImages")(function* addImagesOfNewAssets({
  packageId,
  offset,
  pngs,
}: {
  readonly packageId: number;
  readonly offset: number;
  readonly pngs: readonly Uint8Array[];
}) {
  return yield* pipe(
    pngs,
    Effect.forEach((png, index) => addImage(packageId, png, offset + index)),
  );
});

/** @internal */
const imageStates = Effect.gen(function* imageStates() {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(StateRow)(sql`select embedded from images order by id`);
  return pipe(
    rows,
    Array.map(({ embedded }) => embedded),
  );
});

/** @internal */
const countOf = Effect.fn("countOf")(function* countRows(table: "image_vectors" | "text_vectors") {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(CountRow)(sql`select count(*) as total from ${sql(table)}`);
  return pipe(
    rows,
    Array.map(({ total }) => total),
  );
});

/** @internal */
const addFolderSource = Effect.fn("addFolderSource")(function* addFolderSourceWithPackage(
  relativeFile: string,
  files: readonly LooseFile[],
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sql = yield* SqlClient.SqlClient;
  const folder = yield* fileSystem.makeTempDirectoryScoped();
  const file = path.join(folder, relativeFile);
  yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
  yield* writePackage([], files, file);
  yield* sql`insert into sources(path, kind) values (${folder}, 'folder')`;
  return folder;
});

export {
  addFolderSource,
  addImages,
  addPackage,
  countOf,
  embedderOf,
  imageStates,
  indexInTemporaryFolder,
  recordingEmbedder,
  vectorsFor,
};
