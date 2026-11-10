import { Array as Arr, Context, Duration, Effect, Ref, String as Str, pipe } from "effect";

import { cutoffFor } from "./cutoff.ts";
import type { JudgeError } from "./judge-error.ts";
import { InjectionJudge } from "./judge.ts";
import type { Verdict } from "./judge.ts";
import type { Parser, Span } from "./parser.ts";
import { DEFAULT_PARSERS } from "./parsers.ts";
import { partsOf, unlocatedSpan } from "./parts.ts";
import type { Part } from "./parts.ts";
import { joinRegions } from "./region.ts";
import type { Region } from "./region.ts";
import { AUTO, segmenterOf } from "./segment.ts";

const DEFAULT_MODEL = "respan/span-01-lite";

const MIN_BRANCHES = 2;

const SEPARATING_PROVIDERS = ["typesafe/", "inception/"] as const;

const ONE_SENTENCE = 1;

const FIRST = 0;

interface DetectOptions {
  readonly model?: string;
  readonly cutoff?: number;
  readonly branches?: number;
  readonly parsers?: readonly Parser[];
  readonly format?: string;
}

const branchesFor = (sentenceCount: number): number =>
  Math.max(MIN_BRANCHES, Math.ceil(Math.sqrt(sentenceCount)));

const asksTogether = (model: string): boolean =>
  pipe(
    SEPARATING_PROVIDERS,
    Arr.some((provider) => Str.startsWith(provider)(model)),
  );

interface Probe extends Span, Verdict {
  readonly depth: number;
  readonly millis: number;
}

type ProbeEvent =
  | (Span & { readonly type: "asked"; readonly id: number; readonly depth: number })
  | (Probe & { readonly type: "answered"; readonly id: number });

const ignore = (): Effect.Effect<void> => Effect.void;

const ProbeListener = Context.Reference<(event: ProbeEvent) => Effect.Effect<void>>(
  "@r_masseater/injection-bisect/detect/ProbeListener",
  { defaultValue: () => ignore },
);

type Detection =
  | {
      readonly status: "clean";
      readonly probability: number;
      readonly probes: readonly Probe[];
    }
  | {
      readonly status: "injected";
      readonly probability: number;
      readonly regions: readonly Region[];
      readonly probes: readonly Probe[];
    };

interface Query {
  readonly text: string;
  readonly model: string;
  readonly cutoff: number;
  readonly branches: number;
  readonly record: (probe: Probe) => Effect.Effect<void>;
  readonly nextId: Effect.Effect<number>;
}

const ask = Effect.fn("injection-bisect.ask")(function* ask(
  query: Query,
  span: Span,
  depth: number,
) {
  const judge = yield* InjectionJudge;
  const listen = yield* ProbeListener;
  const id = yield* query.nextId;
  yield* Effect.annotateCurrentSpan({ start: span.start, chars: span.end - span.start, depth });
  yield* listen({ type: "asked", id, ...span, depth });
  const [elapsed, verdict] = yield* Effect.timed(
    judge.verdictOf(Str.slice(span.start, span.end)(query.text), query.model),
  );
  const probe = { ...span, depth, ...verdict, millis: Duration.toMillis(elapsed) };
  yield* query.record(probe);
  yield* listen({ type: "answered", id, ...probe });
  return verdict.probability;
});

interface Judged extends Part {
  readonly probability: number;
  readonly depth: number;
}

const locate = (
  query: Query,
  sentences: readonly Span[],
  found: Judged,
): Effect.Effect<readonly Region[], JudgeError, InjectionJudge> =>
  Effect.gen(function* locateRange() {
    const whole: readonly Region[] = [
      { ...unlocatedSpan(sentences)(found), probability: found.probability },
    ];
    if (found.to - found.from <= ONE_SENTENCE) {
      return whole;
    }
    const depth = found.depth + ONE_SENTENCE;
    const scored = yield* Effect.forEach(
      partsOf({ sentences, branches: query.branches })(found),
      (part) =>
        ask(query, part.span, depth).pipe(
          Effect.map((probability): Judged => ({ ...part, probability, depth })),
        ),
      { concurrency: "unbounded" },
    );
    const hits = pipe(
      scored,
      Arr.filter(({ probability }) => probability >= query.cutoff),
    );
    if (Arr.isReadonlyArrayEmpty(hits)) {
      return whole;
    }
    const nested = yield* Effect.forEach(hits, (hit) => locate(query, sentences, hit), {
      concurrency: "unbounded",
    });
    return nested.flat();
  });

const sharedCost = (index: number, total: number): number => {
  if (index === FIRST) {
    return total;
  }
  return FIRST;
};

const sentenceTextsOf = (query: Query, sentences: readonly Span[]): readonly string[] =>
  pipe(
    sentences,
    Arr.map(({ start, end }) => Str.slice(start, end)(query.text)),
  );

const askTogether = Effect.fn("injection-bisect.ask-together")(function* askTogether(
  query: Query,
  sentences: readonly Span[],
) {
  const judge = yield* InjectionJudge;
  const listen = yield* ProbeListener;
  const depth = ONE_SENTENCE;
  const ids = yield* Effect.replicateEffect(query.nextId, sentences.length);
  yield* Effect.annotateCurrentSpan({ sentences: sentences.length });
  yield* Effect.forEach(
    sentences,
    (span, index) => listen({ type: "asked", id: ids[index] ?? FIRST, ...span, depth }),
    { discard: true },
  );
  const [elapsed, verdicts] = yield* Effect.timed(
    judge.verdictsOf({
      text: query.text,
      parts: sentenceTextsOf(query, sentences),
      model: query.model,
    }),
  );
  const probes = pipe(
    sentences,
    Arr.map((span, index) => ({
      ...span,
      depth,
      probability: verdicts.probabilities[index] ?? FIRST,
      cost: sharedCost(index, verdicts.cost),
      inputTokens: sharedCost(index, verdicts.inputTokens),
      model: verdicts.model,
      millis: Duration.toMillis(elapsed),
    })),
  );
  yield* Effect.forEach(
    probes,
    (probe, index) =>
      query
        .record(probe)
        .pipe(Effect.andThen(listen({ type: "answered", id: ids[index] ?? FIRST, ...probe }))),
    { discard: true },
  );
  return probes;
});

const locateTogether = (
  query: Query,
  sentences: readonly Span[],
  probability: number,
): Effect.Effect<readonly Region[], JudgeError, InjectionJudge> =>
  askTogether(query, sentences).pipe(
    Effect.map((probes) => {
      const hits = pipe(
        probes,
        Arr.filter((probe) => probe.probability >= query.cutoff),
        Arr.map(({ start, end, probability: found }) => ({ start, end, probability: found })),
      );
      if (Arr.isReadonlyArrayEmpty(hits)) {
        return [{ start: FIRST, end: query.text.length, probability }];
      }
      return hits;
    }),
  );

const locateAll = (
  query: Query,
  sentences: readonly Span[],
  probability: number,
): Effect.Effect<readonly Region[], JudgeError, InjectionJudge> => {
  if (asksTogether(query.model)) {
    return locateTogether(query, sentences, probability);
  }
  return locate(query, sentences, {
    from: FIRST,
    to: sentences.length,
    span: { start: FIRST, end: query.text.length },
    probability,
    depth: FIRST,
  });
};

const atLeastTwo = (branches: number): number => {
  if (Number.isInteger(branches)) {
    return Math.max(MIN_BRANCHES, branches);
  }
  return MIN_BRANCHES;
};

const settingsOf = (
  options: DetectOptions,
  sentenceCount: number,
): Pick<Query, "model" | "cutoff" | "branches"> => {
  const model = options.model ?? DEFAULT_MODEL;
  return {
    model,
    cutoff: options.cutoff ?? cutoffFor(model),
    branches: atLeastTwo(options.branches ?? branchesFor(sentenceCount)),
  };
};

const detect = Effect.fn("injection-bisect.detect")(function* detect(
  text: string,
  options: DetectOptions,
) {
  const probes = yield* Ref.make<readonly Probe[]>([]);
  const asked = yield* Ref.make(FIRST);
  const sentences = segmenterOf(options.parsers ?? DEFAULT_PARSERS)({
    text,
    format: options.format ?? AUTO,
  });
  const query: Query = {
    text,
    ...settingsOf(options, sentences.length),
    record: (probe) => Ref.update(probes, (recorded) => [...recorded, probe]),
    nextId: Ref.getAndUpdate(asked, (count) => count + ONE_SENTENCE),
  };
  const probability = yield* ask(query, { start: FIRST, end: text.length }, FIRST);
  if (probability < query.cutoff) {
    return {
      status: "clean",
      probability,
      probes: yield* Ref.get(probes),
    } satisfies Detection;
  }
  const regions = yield* locateAll(query, sentences, probability);
  return {
    status: "injected",
    probability,
    regions: joinRegions(text)(regions),
    probes: yield* Ref.get(probes),
  } satisfies Detection;
});

export { DEFAULT_MODEL, ProbeListener, asksTogether, branchesFor, detect };
export type { Detection, DetectOptions, Probe, ProbeEvent };
