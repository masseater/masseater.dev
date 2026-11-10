import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Array, Effect, FileSystem, Layer, Option, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { EMBEDDING, databaseLayer, vectorBytes } from "#shared/database";
import { Embedder } from "#shared/embedding";
import { Settings } from "#shared/settings";
import { firstId } from "#shared/sql";

import { search } from "./search.ts";

const DIMENSIONS = 768;
const SQUARED_LENGTH = 256;
const FIRST = 0;
const UNIT = 1;
const NEAREST = 15;
const NEAR = 8;
const FAR = 4;
const CROWD = 250;
const MIXED = 260;
const LIMIT = 10;
const MOST = 200;
const NO_SIZE = 0;
const TEXT_STEP = 7;
const IMAGE_STEP = 11;
const IMAGE_EVERY = 3;
const NAMED_EVERY = 5;
const PACKAGES = 3;
const LIBRARY = "/library";
const KINDS = ["texture", "model", "material"] as const;
const EVERYWHERE = Option.getOrNull(Option.none<number>());

interface Asset {
  readonly packageId: number;
  readonly pathname: string;
  readonly kind: string;
  readonly text: string;
  readonly textNearness: Option.Option<number>;
  readonly imageNearness: Option.Option<number>;
}

const vectorOf = (nearness: number): readonly number[] =>
  Array.makeBy(DIMENSIONS, (index) => {
    if (index === FIRST) {
      return nearness;
    }
    return Number(index <= SQUARED_LENGTH - nearness * nearness);
  });

const QUERY = Array.makeBy(DIMENSIONS, (index) => Number(index === FIRST));

const embedderLayer = Layer.succeed(
  Embedder,
  Embedder.of({
    device: "test",
    embedQuery: () => Effect.succeed(QUERY),
    embedDocuments: () => Effect.succeed([]),
    embedImages: () => Effect.succeed([]),
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

const addPackage = Effect.fn("addPackage")(function* addPackage(name: string) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`insert into sources(path, kind) values (${LIBRARY}, 'folder')
    on conflict(path) do nothing`;
  return yield* firstId(
    sql`insert into packages(source_id, kind, path, name, size, modified_at, summary)
      select id, 'unitypackage', ${`${LIBRARY}/${name}`}, ${name}, ${NO_SIZE}, ${NO_SIZE}, '{}'
      from sources where path = ${LIBRARY} returning id`,
  );
});

const addImageVector = Effect.fn("addImageVector")(function* addImageVector(
  assetId: number,
  nearness: number,
) {
  const sql = yield* SqlClient.SqlClient;
  const imageId = yield* firstId(
    sql`insert into images(asset_id, png, embedded)
      values (${assetId}, ${new Uint8Array()}, ${EMBEDDING.done}) returning id`,
  );
  yield* sql`insert into image_vectors(rowid, embedding)
    values (cast(${imageId} as integer), ${vectorBytes(vectorOf(nearness))})`;
});

const addAsset = Effect.fn("addAsset")(function* addAsset({
  packageId,
  pathname,
  kind,
  text,
  textNearness,
  imageNearness,
}: Asset) {
  const sql = yield* SqlClient.SqlClient;
  const id = yield* firstId(
    sql`insert into assets(package_id, guid, pathname, kind, text)
      values (${packageId}, ${pathname}, ${pathname}, ${kind}, ${text}) returning id`,
  );
  yield* pipe(
    Option.toArray(textNearness),
    Effect.forEach(
      (nearness) =>
        sql`insert into text_vectors(rowid, embedding)
          values (cast(${id} as integer), ${vectorBytes(vectorOf(nearness))})`,
    ),
  );
  yield* pipe(
    Option.toArray(imageNearness),
    Effect.forEach((nearness) => addImageVector(id, nearness)),
  );
});

const addAssets = Effect.fn("addAssets")(function* addAssets(assets: readonly Asset[]) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql.withTransaction(pipe(assets, Effect.forEach(addAsset)));
});

const pathnamesOf = (results: readonly { readonly pathname: string }[]): readonly string[] =>
  pipe(
    results,
    Array.map(({ pathname }) => pathname),
  );

const crowdOf = (packageId: number, asset: (index: number) => Omit<Asset, "packageId">): Asset[] =>
  Array.makeBy(CROWD, (index) => ({ packageId, ...asset(index) }));

const seedVectors = Effect.gen(function* seedVectors() {
  const kit = yield* addPackage("Kit");
  const cabin = yield* addPackage("Cabin");
  yield* addAssets([
    ...crowdOf(kit, (index) => ({
      pathname: `Assets/Kit/${index.toString()}.png`,
      kind: "texture",
      text: "kit",
      textNearness: Option.some(NEAREST),
      imageNearness: Option.some(NEAREST),
    })),
    {
      packageId: cabin,
      pathname: "Assets/Cabin/wall.png",
      kind: "texture",
      text: "wall",
      textNearness: Option.some(NEAR),
      imageNearness: Option.none(),
    },
    {
      packageId: cabin,
      pathname: "Assets/Cabin/roof.fbx",
      kind: "model",
      text: "roof",
      textNearness: Option.none(),
      imageNearness: Option.some(NEAR),
    },
    {
      packageId: cabin,
      pathname: "Assets/Cabin/door.fbx",
      kind: "model",
      text: "door",
      textNearness: Option.some(FAR),
      imageNearness: Option.none(),
    },
  ]);
  return cabin;
});

const seedNames = Effect.gen(function* seedNames() {
  const kit = yield* addPackage("Kit");
  const cabin = yield* addPackage("Cabin");
  yield* addAssets([
    ...crowdOf(kit, (index) => ({
      pathname: `Assets/${index.toString()}`,
      kind: "texture",
      text: "needle",
      textNearness: Option.none(),
      imageNearness: Option.none(),
    })),
    {
      packageId: cabin,
      pathname: "Assets/Cabin/Textures/needle.png",
      kind: "texture",
      text: "needle",
      textNearness: Option.none(),
      imageNearness: Option.none(),
    },
  ]);
  return cabin;
});

const nearnessOf = (index: number, step: number): number => ((index * step) % NEAREST) + UNIT;

const mixedAsset =
  (packageIds: readonly number[]) =>
  (index: number): Asset => ({
    packageId: Array.getUnsafe(packageIds, index % packageIds.length),
    pathname: `Assets/${index.toString()}`,
    kind: Array.getUnsafe(KINDS, index % KINDS.length),
    text: pipe(
      Option.liftPredicate("cube", () => index % NAMED_EVERY === FIRST),
      Option.getOrElse(() => "ball"),
    ),
    textNearness: Option.some(nearnessOf(index, TEXT_STEP)),
    imageNearness: Option.liftPredicate(
      nearnessOf(index, IMAGE_STEP),
      () => index % IMAGE_EVERY === FIRST,
    ),
  });

const seedMixed = Effect.gen(function* seedMixed() {
  const packageIds = yield* pipe(
    Array.makeBy(PACKAGES, (index) => `Package${index.toString()}`),
    Effect.forEach(addPackage),
  );
  yield* addAssets(Array.makeBy(MIXED, mixedAsset(packageIds)));
});

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "search in a scope with nearer vectors outside it",
  (it) => {
    it.effect("パッケージの外に近いアセットが 200 個を超えてあっても、中のアセットを返す", () =>
      Effect.gen(function* findsInPackage() {
        const cabin = yield* seedVectors;
        const inPackage = yield* search({
          query: "zzz",
          limit: LIMIT,
          kinds: [],
          packageId: cabin,
        });
        expect(pathnamesOf(inPackage)).toStrictEqual([
          "Assets/Cabin/roof.fbx",
          "Assets/Cabin/wall.png",
          "Assets/Cabin/door.fbx",
        ]);
        const ofKind = yield* search({
          query: "zzz",
          limit: LIMIT,
          kinds: ["model"],
          packageId: EVERYWHERE,
        });
        expect(pathnamesOf(ofKind)).toStrictEqual([
          "Assets/Cabin/roof.fbx",
          "Assets/Cabin/door.fbx",
        ]);
      }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "search in a scope with better name matches outside it",
  (it) => {
    it.effect(
      "パッケージの外に名前の合うアセットが 200 個を超えてあっても、中のアセットを返す",
      () =>
        Effect.gen(function* findsByName() {
          const cabin = yield* seedNames;
          const found = yield* search({
            query: "needle",
            limit: LIMIT,
            kinds: [],
            packageId: cabin,
          });
          expect(pathnamesOf(found)).toStrictEqual(["Assets/Cabin/Textures/needle.png"]);
        }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })("search without a scope", (it) => {
  it.effect("範囲を絞らない検索は、範囲の絞り込みを直す前と同じアセットを同じ得点で返す", () =>
    Effect.gen(function* keepsRanking() {
      yield* seedMixed;
      const found = yield* search({
        query: "cube",
        limit: MOST,
        kinds: [],
        packageId: EVERYWHERE,
      });
      const ranked = pipe(
        found,
        Array.map(({ assetId, score }) => `${assetId.toString()} ${score.toString()}`),
      );
      expect(ranked).toHaveLength(MOST);
      expect(ranked).toMatchSnapshot();
    }),
  );
});
