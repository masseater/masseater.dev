import { expect, layer } from "@effect/vitest";
import { Array, Effect, MutableRef, Ref, String, Tracer, pipe } from "effect";

import { ASSET_ORDER, EMBEDDING } from "#shared/database";
import { Embedder } from "#shared/embedding";

import { embedImages, retryFailedImages } from "./embed-images.ts";
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
const SECOND = 2;
const THIRD = 3;
const MANY_STARTS = 4;
const ONE_BATCH = 8;
const FOUR_BATCHES = 32;
const QUERY_TEXT = "db.query.text";

const { done: DONE, failed: FAILED } = EMBEDDING;

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

const restartWith = Effect.fn("restartWith")(function* restartWith(
  embedder: typeof Embedder.Service,
) {
  yield* retryFailedImages;
  yield* embed.pipe(Effect.provideService(Embedder, embedder));
});

const embedAfterAdding = Effect.fn("embedAfterAdding")(function* embedAfterAdding({
  packageId,
  offset,
  pngs,
  embedder,
}: {
  readonly packageId: number;
  readonly offset: number;
  readonly pngs: readonly Uint8Array[];
  readonly embedder: typeof Embedder.Service;
}) {
  yield* addImages({ packageId, offset, pngs });
  yield* embed.pipe(Effect.provideService(Embedder, embedder));
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
    it.effect("一度失敗した画像を、ほかの画像の埋め込みが成功したあとでやり直す", () =>
      Effect.gen(function* retriesAfterSuccess() {
        const packageId = yield* addPackage;
        yield* addImages({
          packageId,
          offset: FIRST,
          pngs: [png(GOOD), png(GOOD), png(FLAKY), png(GOOD)],
        });
        const embedder = yield* flakyEmbedder(TWICE);
        yield* embed.pipe(Effect.provideService(Embedder, embedder));
        const states = yield* imageStates;
        expect(states).toStrictEqual([DONE, DONE, DONE, DONE]);
        const vectors = yield* countOf("image_vectors");
        expect(vectors).toStrictEqual([states.length]);
      }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "embedImages with an image that never embeds",
  (it) => {
    it.effect("失敗し続ける画像のやり直しを、決まった回数で打ち切る", () =>
      Effect.gen(function* givesUp() {
        const packageId = yield* addPackage;
        const { embedder, calls } = yield* brokenEmbedder;
        yield* embedAfterAdding({
          packageId,
          offset: FIRST,
          pngs: [png(GOOD), png(BROKEN)],
          embedder,
        });
        yield* embedAfterAdding({ packageId, offset: SECOND, pngs: [png(GOOD)], embedder });
        const tried = yield* calls;
        yield* embedAfterAdding({ packageId, offset: THIRD, pngs: [png(GOOD)], embedder });
        const triedAfterGivingUp = yield* calls;
        expect(triedAfterGivingUp).toBe(tried);
        const states = yield* imageStates;
        expect(states).toStrictEqual([DONE, FAILED, DONE, DONE]);
      }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "embedImages after a restart",
  (it) => {
    it.effect(
      "埋め込みが止まっている間に何度起動しても、失敗した画像を起動のたびに未処理へ戻す",
      () =>
        Effect.gen(function* retriesOnStart() {
          const packageId = yield* addPackage;
          yield* addImages({ packageId, offset: FIRST, pngs: [png(GOOD), png(GOOD)] });
          yield* embed.pipe(Effect.provideService(Embedder, downEmbedder));
          yield* restartWith(downEmbedder).pipe(Effect.repeat({ times: MANY_STARTS }));
          const stopped = yield* imageStates;
          expect(stopped).toStrictEqual([FAILED, FAILED]);
          yield* restartWith(embedderOf({}));
          const restarted = yield* imageStates;
          expect(restarted).toStrictEqual([DONE, DONE]);
        }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "embedImages with a vector that cannot be saved",
  (it) => {
    it.effect("同じバッチの保存できたはずの画像を失敗扱いにしない", () =>
      Effect.gen(function* keepsSavable() {
        const packageId = yield* addPackage;
        yield* addImages({ packageId, offset: FIRST, pngs: [png(GOOD), png(MISSHAPEN)] });
        yield* embed.pipe(Effect.provideService(Embedder, misshapingEmbedder));
        const states = yield* imageStates;
        expect(states).toStrictEqual([DONE, FAILED]);
      }),
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
