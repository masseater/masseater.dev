import type { Detection, Region } from "@r_masseater/injection-bisect";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { EXAMPLES } from "./examples";
import type { Example } from "./examples";
import type { Phase } from "./trace";

interface Span {
  readonly start: number;
  readonly end: number;
}

type Grade =
  | { readonly status: "unknown" }
  | { readonly status: "pending" }
  | { readonly status: "correct-clean" }
  | { readonly status: "false-alarm" }
  | { readonly status: "missed" }
  | { readonly status: "found"; readonly covered: number; readonly extra: number };

const PERCENT = 100;

const NOT_FOUND = -1;

const exampleOf = (text: string): Option.Option<Example> =>
  Arr.findFirst(EXAMPLES, (example) => example.text === text);

const spanIn = (text: string, answer: string): Span => {
  const start = pipe(
    text,
    Str.indexOf(answer),
    Option.getOrElse(() => NOT_FOUND),
  );
  return { start, end: start + answer.length };
};

const answerSpansOf = (text: string): Option.Option<readonly Span[]> =>
  exampleOf(text).pipe(
    Option.flatMap((example) => {
      if (example.kind === "clean") {
        return Option.none();
      }
      return Option.some(
        pipe(
          example.answers,
          Arr.map((answer) => spanIn(example.text, answer)),
        ),
      );
    }),
  );

const answerOf = (text: string): readonly Span[] => Option.getOrElse(answerSpansOf(text), () => []);

const visibleIn = (text: string, { start, end }: Span): number =>
  pipe(text, Str.slice(start, end), Str.replaceAll(/\s/gu, "")).length;

const overlapOf = (left: Span, right: Span): Span => ({
  start: Math.max(left.start, right.start),
  end: Math.max(Math.max(left.start, right.start), Math.min(left.end, right.end)),
});

const foundGrade = (text: string, answers: readonly Span[], regions: readonly Region[]): Grade => {
  let hit = 0;
  let found = 0;
  let expected = 0;
  for (const answer of answers) {
    expected += visibleIn(text, answer);
    for (const region of regions) {
      hit += visibleIn(text, overlapOf(answer, region));
    }
  }
  for (const region of regions) {
    found += visibleIn(text, region);
  }
  return {
    status: "found",
    covered: Math.round((hit / expected) * PERCENT),
    extra: found - hit,
  };
};

const cleanGrade = (detection: Detection): Grade => {
  if (detection.status === "clean") {
    return { status: "correct-clean" };
  }
  return { status: "false-alarm" };
};

const injectedGrade = (text: string, detection: Detection, answers: readonly Span[]): Grade => {
  if (detection.status === "clean") {
    return { status: "missed" };
  }
  return foundGrade(text, answers, detection.regions);
};

const gradeOf = ({ text, phase }: Readonly<{ text: string; phase: Phase }>): Grade => {
  if (Option.isNone(exampleOf(text)) || phase.status === "failed") {
    return { status: "unknown" };
  }
  if (phase.status === "running") {
    return { status: "pending" };
  }
  return Option.match(answerSpansOf(text), {
    onNone: () => cleanGrade(phase.detection),
    onSome: (answers) => injectedGrade(text, phase.detection, answers),
  });
};

export type { Grade };
export { answerOf, gradeOf };
