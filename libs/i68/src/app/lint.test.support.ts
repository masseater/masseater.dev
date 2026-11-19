import { Array as Arr, Effect, Option, Predicate, pipe } from "effect";

import { definePlugin, defineRule } from "#/entities/rule/index.ts";
import type { I68Config, Rule } from "#/shared/config/index.ts";
import type { I68Error } from "#/shared/lib/errors.ts";

import { format } from "./format.ts";
import { lintText } from "./lint.ts";

const HIGH = 72;
const LOW = 48;

export const PATH = "/song.fumx";

const maxOf = (options: Readonly<Record<string, unknown>>): number =>
  pipe(
    Option.fromUndefinedOr(options["max"]),
    Option.filter(Predicate.isNumber),
    Option.getOrElse(() => HIGH),
  );

const tooHigh: Rule = defineRule({
  meta: { description: "Notes stay at or below C5 unless max says otherwise" },
  check: (context) => {
    for (const sounding of context.soundings) {
      if (sounding.midi > maxOf(context.options)) {
        context.report({
          line: sounding.line,
          column: sounding.column,
          message: `${sounding.track} is too high`,
          detail: "Move it down an octave",
        });
      }
    }
  },
});

const tooLow: Rule = defineRule({
  meta: { description: "Notes stay at or above C3" },
  check: (context) => {
    for (const sounding of context.soundings) {
      if (sounding.midi < LOW) {
        context.report({
          line: sounding.line,
          column: sounding.column,
          message: `${sounding.track} is too low`,
        });
      }
    }
  },
});

const bars: Rule = defineRule({
  meta: { description: "Reports the number of bars on the first line" },
  check: (context) => {
    context.report({ line: 1, message: `${String(context.song.bars.length)} bars` });
  },
});

const broken: Rule = defineRule({
  meta: { description: "Throws" },
  check: () => {
    throw new Error("boom");
  },
});

export const range = definePlugin({ rules: { "too-high": tooHigh, "too-low": tooLow } });

export const extra = definePlugin({ rules: { bars, broken } });

export const CONFIG: I68Config = {
  plugins: { range },
  rules: { "range/too-high": "warn", "range/too-low": "warn" },
};

export const titled =
  (title: string) =>
  (body: string): string =>
    `song "${title}"

instrument lead sample "lead.flac" root C4

track lead instrument lead role melody

bar meter 4/4 tempo 120bpm {
${body}
}
`;

export const song = titled("test");

export const linesWith =
  (config: I68Config) =>
  (text: string): Effect.Effect<readonly string[], I68Error> =>
    pipe(lintText({ path: PATH, text, config }), Effect.map(Arr.map(format)));

export const linesOf = linesWith(CONFIG);
