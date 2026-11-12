import type { Classified, Paragraph, ParagraphKind } from "@masseater.dev/yohaku-protocol";
import { Array, Context, Duration, Effect, FiberMap, HashMap, Layer, Option, pipe } from "effect";
import type { SecureRandom } from "effect/crypto";
import type { SqlClient } from "effect/sql";

import { readParagraphs } from "#entities/manuscript";
import { listFacts } from "#entities/source";
import { classify } from "#features/classify";
import type { Context as WritingContext } from "#features/draft";
import { extractManuscript } from "#features/ingest";
import type { Agent } from "#shared/agent";

const SETTLE = Duration.fromInputUnsafe("30 seconds");
const PROSE: typeof ParagraphKind.Type = "prose";
const NO_KINDS: readonly (typeof Classified.Type)[] = [];

interface Reading {
  readonly kinds: readonly (typeof Classified.Type)[];
  readonly prose: readonly (typeof Paragraph.Type)[];
}

const isProse =
  (kinds: HashMap.HashMap<string, typeof ParagraphKind.Type>) =>
  ({ id }: typeof Paragraph.Type): boolean =>
    pipe(
      HashMap.get(kinds, id),
      Option.getOrElse(() => PROSE),
    ) === PROSE;

/** @internal */
const read = Effect.fn("read")(function* read(paragraphs: readonly (typeof Paragraph.Type)[]) {
  const kinds = yield* classify(paragraphs).pipe(
    Effect.tapError((problem) => Effect.logWarning("classify failed", problem)),
    Effect.orElseSucceed(() => NO_KINDS),
  );
  const kindOf = pipe(
    kinds,
    Array.map(({ paragraphId, kind }) => [paragraphId, kind] as const),
    HashMap.fromIterable,
  );
  return { kinds, prose: pipe(paragraphs, Array.filter(isProse(kindOf))) } satisfies Reading;
});

/** @internal */
const contextFor = Effect.fn("contextFor")(function* contextFor(id: string) {
  const paragraphs = yield* readParagraphs(id);
  const { prose } = yield* read(paragraphs);
  const facts = yield* listFacts();
  const proseTexts = pipe(
    prose,
    Array.map(({ text }) => text),
  );
  return { paragraphs, prose: proseTexts, facts } satisfies WritingContext;
});

class Understanding extends Context.Service<
  Understanding,
  { readonly changed: (id: string) => Effect.Effect<void> }
>()("yohaku-server/app/understanding") {}

const extractAfterSettling = Effect.fn("extractAfterSettling")(function* settled(id: string) {
  yield* Effect.sleep(SETTLE);
  const paragraphs = yield* readParagraphs(id);
  const { prose } = yield* read(paragraphs);
  yield* extractManuscript({
    manuscriptId: id,
    prose: pipe(
      prose,
      Array.map(({ text }) => text),
    ),
  });
});

/** @internal */
const understandingLayer = Layer.effect(
  Understanding,
  Effect.gen(function* understanding() {
    const fibers = yield* FiberMap.make<string>();
    const context = yield* Effect.context<
      Agent | SecureRandom.SecureRandom | SqlClient.SqlClient
    >();
    const extract = (id: string): Effect.Effect<void> =>
      extractAfterSettling(id).pipe(
        Effect.tapError((problem) => Effect.logWarning("extract failed", problem)),
        Effect.ignore,
        Effect.provideContext(context),
      );
    return Understanding.of({
      changed: (id) => FiberMap.run(fibers, id, extract(id)).pipe(Effect.asVoid),
    });
  }),
);

export { Understanding, contextFor, read, understandingLayer };
