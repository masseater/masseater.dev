import { expect, layer } from "@effect/vitest";
import { Array, Effect, MutableRef, Option, Ref, String, Tracer, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { ASSET_ORDER, EMBEDDING } from "#shared/database";
import { Embedder } from "#shared/embedding";

import { embedImages } from "./embed-images.ts";
import {
  addImages,
  addPackage,
  countOf,
  embedderOf,
  imageStates,
  indexInTemporaryFolder,
  vectorsFor,
} from "./library.test.support.ts";

const GOOD = 1;
const FLAKY = 2;
const MISSHAPEN = 3;
const BROKEN = 4;
const KIND_BYTE = 0;
const UNIT = 1;
const NONE = 0;
const FIRST = 0;
const TWICE = 2;
const MANY_TRIES = 12;
const EVERY_SEVENTH = 7;
const TEN_THOUSAND = 10_000;
const ONE_BATCH = 8;
const FOUR_BATCHES = 32;
const QUERY_TEXT = "db.query.text";

const { done: DONE, pending: PENDING } = EMBEDDING;

const png = (kind: number): Uint8Array => new Uint8Array([kind]);

const isKind =
  (kind: number) =>
  (image: Uint8Array): boolean =>
    image.at(KIND_BYTE) === kind;

const embed = embedImages(() => Effect.void);

const flakyEmbedder = Effect.fn("flakyEmbedder")(function* flakyEmbedder(failures: number) {
  const remaining = yield* Ref.make(failures);
  return embedderOf({
    embedImages: (pngs) => {
      if (!pipe(pngs, Array.some(isKind(FLAKY)))) {
        return vectorsFor(pngs);
      }
      return Ref.modify(remaining, (left) => [left > NONE, Math.max(left - UNIT, NONE)]).pipe(
        Effect.flatMap((fails) => {
          if (fails) {
            return Effect.die("embedder is down");
          }
          return vectorsFor(pngs);
        }),
      );
    },
  });
});

const brokenEmbedder = Effect.gen(function* brokenEmbedder() {
  const calls = yield* Ref.make(NONE);
  const embedder = embedderOf({
    embedImages: (pngs) => {
      if (!pipe(pngs, Array.some(isKind(BROKEN)))) {
        return vectorsFor(pngs);
      }
      return Ref.update(calls, (count) => count + UNIT).pipe(
        Effect.andThen(Effect.die("unreadable image")),
      );
    },
  });
  return { embedder, calls: Ref.get(calls) };
});

const downEmbedder = embedderOf({ embedImages: () => Effect.die("embedder is down") });

const sometimesDownEmbedder = Effect.gen(function* sometimesDownEmbedder() {
  const calls = yield* Ref.make(NONE);
  return embedderOf({
    embedImages: (pngs) =>
      Ref.updateAndGet(calls, (count) => count + UNIT).pipe(
        Effect.flatMap((count) => {
          if (count % EVERY_SEVENTH === NONE) {
            return Effect.die("embedder is down");
          }
          return vectorsFor(pngs);
        }),
      ),
  });
});

const makeRetriesDue = Effect.gen(function* makeRetriesDue() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`update images set retry_at = 0`;
});

const embedWith = Effect.fn("embedWith")(function* embedWith(embedder: typeof Embedder.Service) {
  return yield* embed.pipe(Effect.provideService(Embedder, embedder));
});

const embedUntilDone = Effect.fn("embedUntilDone")(function* embedUntilDone(
  embedder: typeof Embedder.Service,
) {
  yield* Effect.andThen(makeRetriesDue, embedWith(embedder)).pipe(
    Effect.repeat({ while: (wait) => Option.isSome(wait) }),
  );
});

const misshapingEmbedder = embedderOf({
  embedImages: (pngs) =>
    vectorsFor(pngs).pipe(
      Effect.map((vectors) =>
        pipe(
          vectors,
          Array.zip(pngs),
          Array.map(([vector, image]) => {
            if (isKind(MISSHAPEN)(image)) {
              return [UNIT];
            }
            return vector;
          }),
        ),
      ),
    ),
});

const orderedSelectsIn = Effect.fn("orderedSelectsIn")(function* countOrderedSelects<
  Failure,
  Requirements,
>(run: Effect.Effect<void, Failure, Requirements>) {
  const spans = MutableRef.make<readonly Tracer.NativeSpan[]>([]);
  const tracer = Tracer.make({
    span: (options) => {
      const span = new Tracer.NativeSpan(options);
      MutableRef.update(spans, Array.append(span));
      return span;
    },
  });
  yield* Effect.withTracer(run, tracer);
  return pipe(
    MutableRef.get(spans),
    Array.filter((span) =>
      pipe(globalThis.String(span.attributes.get(QUERY_TEXT)), String.includes(ASSET_ORDER)),
    ),
    Array.length,
  );
});

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "embedImages after a passing failure",
  (it) => {
    it.effect("失敗した画像を未処理のまま残し、待ち時間のあとで成功するまでやり直す", () =>
      Effect.gen(function* retriesUntilEmbedded() {
        const packageId = yield* addPackage;
        yield* addImages({
          packageId,
          offset: FIRST,
          pngs: [png(GOOD), png(GOOD), png(FLAKY), png(GOOD)],
        });
        const embedder = yield* flakyEmbedder(TWICE);
        const wait = yield* embedWith(embedder);
        const afterFailure = yield* imageStates;
        yield* embedUntilDone(embedder);
        const [states, vectors] = yield* Effect.all([imageStates, countOf("image_vectors")]);
        expect({ waits: Option.isSome(wait), afterFailure, states, vectors }).toStrictEqual({
          waits: true,
          afterFailure: [DONE, DONE, PENDING, DONE],
          states: [DONE, DONE, DONE, DONE],
          vectors: [states.length],
        });
      }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "embedImages with an image that keeps failing",
  (it) => {
    it.effect("何度失敗しても打ち切らず、やり直すたびに埋め込みを試す", () =>
      Effect.gen(function* neverGivesUp() {
        const packageId = yield* addPackage;
        const { embedder, calls } = yield* brokenEmbedder;
        yield* addImages({ packageId, offset: FIRST, pngs: [png(GOOD), png(BROKEN)] });
        const tries = yield* pipe(
          Effect.andThen(makeRetriesDue, embedWith(embedder)),
          Effect.andThen(calls),
          Effect.replicateEffect(MANY_TRIES),
        );
        const states = yield* imageStates;
        expect(states).toStrictEqual([DONE, PENDING]);
        expect(Array.dedupe(tries)).toHaveLength(MANY_TRIES);
      }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "embedImages while the embedder is down",
  (it) => {
    it.effect("埋め込みが止まっている間の画像を未処理に残し、戻ったら全部埋め込む", () =>
      Effect.gen(function* resumesAfterOutage() {
        const packageId = yield* addPackage;
        yield* addImages({ packageId, offset: FIRST, pngs: [png(GOOD), png(GOOD)] });
        const wait = yield* embedWith(downEmbedder);
        const stopped = yield* imageStates;
        expect(Option.isSome(wait)).toBe(true);
        expect(stopped).toStrictEqual([PENDING, PENDING]);
        yield* embedUntilDone(embedderOf({}));
        const restarted = yield* imageStates;
        expect(restarted).toStrictEqual([DONE, DONE]);
      }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "embedImages with a vector that cannot be saved",
  (it) => {
    it.effect("同じバッチの保存できる画像は保存し、保存できない画像だけを未処理に残す", () =>
      Effect.gen(function* keepsSavable() {
        const packageId = yield* addPackage;
        yield* addImages({ packageId, offset: FIRST, pngs: [png(GOOD), png(MISSHAPEN)] });
        yield* embedWith(misshapingEmbedder);
        const states = yield* imageStates;
        expect(states).toStrictEqual([DONE, PENDING]);
      }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "embedImages over ten thousand images",
  (it) => {
    it.effect(
      "1 万枚の画像を、埋め込みがときどき止まっても 1 枚も残さず埋め込む",
      () =>
        Effect.gen(function* embedsEveryImage() {
          const packageId = yield* addPackage;
          yield* addImages({
            packageId,
            offset: FIRST,
            pngs: Array.makeBy(TEN_THOUSAND, () => png(GOOD)),
          });
          const embedder = yield* sometimesDownEmbedder;
          yield* embedUntilDone(embedder);
          const states = yield* imageStates;
          const vectors = yield* countOf("image_vectors");
          expect(
            pipe(
              states,
              Array.filter((state) => state === DONE),
            ),
          ).toHaveLength(TEN_THOUSAND);
          expect(vectors).toStrictEqual([TEN_THOUSAND]);
        }),
      { timeout: 120_000 },
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "embedImages over several batches",
  (it) => {
    it.effect("未処理の画像を並べ直す回数がバッチの数で増えない", () =>
      Effect.gen(function* selectsOncePerRun() {
        const packageId = yield* addPackage;
        const run = embed.pipe(Effect.provideService(Embedder, embedderOf({})));
        yield* addImages({
          packageId,
          offset: FIRST,
          pngs: Array.makeBy(ONE_BATCH, () => png(GOOD)),
        });
        const single = yield* orderedSelectsIn(run);
        yield* addImages({
          packageId,
          offset: ONE_BATCH,
          pngs: Array.makeBy(FOUR_BATCHES, () => png(GOOD)),
        });
        const several = yield* orderedSelectsIn(run);
        expect(single).toBeGreaterThan(NONE);
        expect(several).toBe(single);
        const states = yield* imageStates;
        expect(states).toStrictEqual(Array.makeBy(ONE_BATCH + FOUR_BATCHES, () => DONE));
      }),
    );
  },
);
