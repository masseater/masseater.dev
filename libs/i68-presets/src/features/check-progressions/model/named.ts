import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { progressionOf } from "#/shared/lib/degrees.ts";
import type { Step } from "#/shared/lib/degrees.ts";
import { reporterOf } from "#/shared/lib/voices.ts";

export interface Progression {
  readonly name: string;
  readonly degrees: readonly string[];
}

export const PROGRESSIONS: readonly Progression[] = [
  { name: "丸サ進行 (Just the Two of Us)", degrees: ["IVM7", "III7", "VIm7"] },
  { name: "王道進行", degrees: ["IV", "V", "IIIm", "VIm"] },
  { name: "小室進行", degrees: ["VIm", "IV", "V", "I"] },
  { name: "カノン進行", degrees: ["I", "V", "VIm", "IIIm", "IV", "I", "IV", "V"] },
  { name: "ii–V–I", degrees: ["IIm", "V", "I"] },
  { name: "Andalusian cadence", degrees: ["VIm", "V", "IV", "III"] },
];

const START = 0;

const FAMILIES = [
  ["M7", ""],
  ["m7b5", "dim"],
  ["m7", "m"],
  ["dim7", "dim"],
  ["7", ""],
] as const;

const familyOf = (token: string): string =>
  pipe(
    FAMILIES,
    Arr.findFirst(([suffix]) => Str.endsWith(suffix)(token)),
    Option.match({
      onNone: () => token,
      onSome: ([suffix, triad]) =>
        `${Str.slice(START, token.length - suffix.length)(token)}${triad}`,
    }),
  );

const matches =
  (steps: readonly Step[], degrees: readonly string[]) =>
  (start: number): boolean =>
    pipe(
      degrees,
      Arr.every((degree, offset) =>
        pipe(
          Arr.get(steps, start + offset),
          Option.exists((step) => familyOf(step.token) === familyOf(degree)),
        ),
      ),
    );

export const namedProgression: Rule = defineRule({
  meta: { description: "Names the well-known chord progressions a song uses" },
  check: (context) => {
    const steps = progressionOf(context.soundings)(context.song);
    const report = reporterOf(context);
    for (const progression of PROGRESSIONS) {
      const starts = pipe(
        Arr.makeBy(steps.length, (index) => index),
        Arr.filter(matches(steps, progression.degrees)),
      );
      for (const step of pipe(
        starts,
        Arr.flatMap((start) => Option.toArray(Arr.get(steps, start))),
      )) {
        report(`${progression.name}:${String(step.line)}:${String(step.bar)}`, {
          line: step.line,
          column: step.column,
          message: `${progression.name} (${Arr.join(progression.degrees, "–")}) starts in bar ${String(step.bar)}`,
        });
      }
    }
  },
});
