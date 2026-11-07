import {
  AredokoClient,
  ENDPOINT_FILE,
  ServerUrl,
  aredokoClientLayer,
  awaitEndpoint,
} from "@masseater.dev/aredoko-protocol";
import {
  Array,
  Duration,
  Effect,
  FileSystem,
  HashMap,
  Layer,
  Option,
  Path,
  Schedule,
  pipe,
} from "effect";

import { guidOf, pathnameOf } from "./conditions.ts";
import type { Condition, LibraryAsset, Placed } from "./conditions.ts";
import type { Query } from "./fixtures.ts";
import { imageOf } from "./images.ts";
import { score } from "./metrics.ts";
import { startServer } from "./server.ts";

const PROJECT_ROOT = "/aredoko-eval";
const UPLOAD_BATCH = 10;
const RESULT_LIMIT = 10;
const ALL_PACKAGES = Option.getOrNull(Option.none<number>());
const IDLE_INTERVAL = Duration.fromInputUnsafe("2 seconds");

const placedOf = (assets: readonly LibraryAsset[]): readonly Placed[] =>
  pipe(
    assets,
    Array.map((asset, index) => ({ asset, index })),
  );

const projectAsset = Effect.fn("projectAsset")(function* projectAsset(
  condition: Condition,
  placed: Placed,
) {
  const image = yield* imageOf(placed.asset);
  return {
    guid: guidOf(placed.index),
    pathname: pathnameOf(condition)(placed),
    previews: [image],
  };
});

const upload = Effect.fn("upload")(function* uploadLibrary(
  condition: Condition,
  placed: readonly Placed[],
) {
  const { PutProjectAssets: putProjectAssets } = yield* AredokoClient;
  const projectPath = `${PROJECT_ROOT}/${condition}`;
  yield* pipe(
    placed,
    Array.chunksOf(UPLOAD_BATCH),
    Effect.forEach((batch) =>
      pipe(
        batch,
        Effect.forEach((entry) => projectAsset(condition, entry)),
        Effect.flatMap((assets) => putProjectAssets({ projectPath, assets, complete: false })),
      ),
    ),
  );
  yield* putProjectAssets({ projectPath, assets: [], complete: true });
});

const waitUntilIndexed = Effect.fn("waitUntilIndexed")(function* waitUntilIndexed() {
  const { GetStatus: getStatus } = yield* AredokoClient;
  yield* getStatus().pipe(
    Effect.repeat({
      schedule: Schedule.spaced(IDLE_INTERVAL),
      until: ({ indexing, images }) => !indexing && images.done === images.total,
    }),
  );
});

const searchAll = Effect.fn("searchAll")(function* searchAll(
  condition: Condition,
  placed: readonly Placed[],
  queries: readonly Query[],
) {
  const { Search: search } = yield* AredokoClient;
  const idsByPathname = pipe(
    placed,
    Array.map((entry) => [pathnameOf(condition)(entry), entry.asset.id] as const),
    HashMap.fromIterable,
  );
  return yield* pipe(
    queries,
    Effect.forEach(({ query, expected }) =>
      search({ query, limit: RESULT_LIMIT, kinds: [], packageId: ALL_PACKAGES }).pipe(
        Effect.map(({ results }) => ({
          query,
          expected,
          results: pipe(
            results,
            Array.map(({ pathname }) => HashMap.get(idsByPathname, pathname)),
            Array.getSomes,
          ),
        })),
      ),
    ),
  );
});

const run = Effect.fn("run")(function* runCondition(
  condition: Condition,
  placed: readonly Placed[],
  queries: readonly Query[],
) {
  yield* upload(condition, placed);
  yield* waitUntilIndexed();
  const found = yield* searchAll(condition, placed, queries);
  return score(found);
});

/** @internal */
const evaluate = Effect.fn("evaluate")(function* evaluateCondition(
  condition: Condition,
  assets: readonly LibraryAsset[],
  queries: readonly Query[],
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dataDirectory = yield* fileSystem.makeTempDirectoryScoped({ prefix: "aredoko-eval-" });
  const endpointFile = path.join(dataDirectory, ENDPOINT_FILE);
  const serverUrlLayer = Layer.succeed(ServerUrl, {
    url: awaitEndpoint(fileSystem.readFileString(endpointFile)),
  });
  const context = yield* Layer.build(aredokoClientLayer.pipe(Layer.provide(serverUrlLayer)));
  const evaluation = run(condition, placedOf(assets), queries);
  return yield* startServer(dataDirectory).pipe(
    Effect.andThen(evaluation),
    Effect.provideContext(context),
  );
}, Effect.scoped);

export { evaluate };
