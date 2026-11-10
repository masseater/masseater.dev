import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { INJECTION, fakeJudge } from "./__tests__/fake-judge.ts";
import { detect } from "./detect.ts";
import type { Detection, DetectOptions } from "./detect.ts";
import type { JudgeError } from "./judge-error.ts";
import { InjectionJudge } from "./judge.ts";
import type { Verdict } from "./judge.ts";
import type { Parser } from "./parser.ts";

const LEADING = "前置きです。";

const CLEAN_SENTENCES = "今日は晴れ。会議は午後から。資料は共有済み。";

const TRAILING = "以上です。";

const FIRST = 0;

const ONE_REQUEST = 1;

const detected = (text: string, options: DetectOptions): Effect.Effect<Detection, JudgeError> =>
  detect(text, options).pipe(Effect.provideService(InjectionJudge, fakeJudge));

const regionTexts = (text: string, detection: Detection): readonly string[] => {
  if (detection.status === "clean") {
    return [];
  }
  return pipe(
    detection.regions,
    Arr.map(({ start, end }) => Str.slice(start, end)(text)),
  );
};

const NO_UNITS: Parser = {
  format: "no-units",
  extensions: [],
  accepts: () => true,
  unitsOf: () => [],
};

test("returns the whole judged text as the region when the document has no units", () =>
  Effect.runPromise(
    Effect.gen(function* unlocated() {
      const detection = yield* detected(INJECTION, { parsers: [NO_UNITS] });
      expect(detection.probes).toHaveLength(ONE_REQUEST);
      expect(detection).toMatchObject({
        status: "injected",
        regions: [{ start: FIRST, end: INJECTION.length }],
      });
    }),
  ));

const CLEAN_ONLY: Parser = {
  format: "clean-only",
  extensions: [],
  accepts: () => true,
  unitsOf: () => [
    { kind: "prose", start: INJECTION.length, end: INJECTION.length + CLEAN_SENTENCES.length },
  ],
};

test("returns the whole judged text, outside the units included, when no part is judged injected", () =>
  Effect.runPromise(
    Effect.gen(function* outside() {
      const text = `${INJECTION}${CLEAN_SENTENCES}${TRAILING}`;
      const detection = yield* detected(text, { parsers: [CLEAN_ONLY] });
      expect(detection.probes.length).toBeGreaterThan(ONE_REQUEST);
      expect(detection).toMatchObject({
        status: "injected",
        regions: [{ start: FIRST, end: text.length }],
      });
    }),
  ));

const ONE_UNIT: Parser = {
  format: "one-unit",
  extensions: [],
  accepts: () => true,
  unitsOf: () => [{ kind: "whole", start: LEADING.length, end: LEADING.length + INJECTION.length }],
};

test("keeps the span of the only unit as the region without asking about it", () =>
  Effect.runPromise(
    Effect.gen(function* single() {
      const text = `${LEADING}${INJECTION}${TRAILING}`;
      const detection = yield* detected(text, { parsers: [ONE_UNIT] });
      expect(detection.probes).toHaveLength(ONE_REQUEST);
      expect(regionTexts(text, detection)).toStrictEqual([INJECTION]);
    }),
  ));

const TOO_FEW_BRANCHES = [
  { branches: 1 },
  { branches: 0 },
  { branches: -1 },
  { branches: 2.5 },
  { branches: Number.NaN },
  { branches: Number.POSITIVE_INFINITY },
] as const;

const SOON = 5000;

const ALWAYS_INJECTED = {
  verdictOf: (): Effect.Effect<Verdict> => fakeJudge.verdictOf(INJECTION),
  verdictsOf: fakeJudge.verdictsOf,
};

test("finishes and returns regions when branches is below 2", { timeout: SOON }, () =>
  Effect.runPromise(
    Effect.gen(function* clamped() {
      const detections = yield* Effect.all(
        pipe(
          TOO_FEW_BRANCHES,
          Arr.map((options) =>
            detect(CLEAN_SENTENCES, options).pipe(
              Effect.provideService(InjectionJudge, ALWAYS_INJECTED),
            ),
          ),
        ),
      );
      expect(
        pipe(
          detections,
          Arr.map((detection) => regionTexts(CLEAN_SENTENCES, detection)),
        ),
      ).toStrictEqual(
        pipe(
          TOO_FEW_BRANCHES,
          Arr.map(() => [CLEAN_SENTENCES]),
        ),
      );
    }),
  ),
);
