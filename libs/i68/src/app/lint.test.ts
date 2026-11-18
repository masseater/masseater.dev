import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";

import { definePlugin, defineRule } from "#/entities/rule/index.ts";
import type { I68Config } from "#/shared/config/index.ts";
import type { I68Error } from "#/shared/lib/errors.ts";

import { format } from "./format.ts";
import { lintText } from "./lint.ts";

const HIGH = 72;
const PATH = "/song.fumx";

const tooHigh = defineRule({
  meta: { description: "Notes stay at or below C5" },
  check: (context) => {
    for (const sounding of context.soundings) {
      if (sounding.midi > HIGH) {
        context.report({
          line: sounding.line,
          column: sounding.column,
          message: `${sounding.track} is too high`,
        });
      }
    }
  },
});

const plugin = definePlugin({ rules: { "too-high": tooHigh } });

const song = (body: string): string => `song "test"

instrument lead sample "lead.flac" root C4

track lead instrument lead role melody

bar meter 4/4 tempo 120bpm {
${body}
}
`;

const CONFIG: I68Config = { plugins: { range: plugin }, rules: { "range/too-high": "warn" } };

const linesOf = (
  text: string,
  config: I68Config = CONFIG,
): Effect.Effect<readonly string[], I68Error> =>
  pipe(lintText({ path: PATH, text, config }), Effect.map(Arr.map(format)));

it.effect("reports what a rule finds with the configured severity and position", () =>
  Effect.gen(function* severity() {
    const found = yield* linesOf(song("  lead: C4 1/2, D6 1/2"));
    expect(found).toStrictEqual(["/song.fumx:8:17 warn range/too-high lead is too high"]);
  }),
);

it.effect("turns a rule on as an error when the config does not name it", () =>
  Effect.gen(function* fallback() {
    const found = yield* linesOf(song("  lead: D6 1/1"), { plugins: { range: plugin } });
    expect(found).toStrictEqual(["/song.fumx:8:9 error range/too-high lead is too high"]);
  }),
);

it.effect("skips a rule that is off", () =>
  Effect.gen(function* off() {
    const config: I68Config = { extends: [CONFIG], rules: { "range/too-high": "off" } };
    const found = yield* linesOf(song("  lead: D6 1/1"), config);
    expect(found).toStrictEqual([]);
  }),
);

const IGNORED = [
  song("  lead: D6 1/1 // i68-ignore range/too-high"),
  song("  // i68-ignore-next-line\n  lead: D6 1/1"),
  `// i68-ignore-file range/too-high\n${song("  lead: D6 1/1")}`,
];

it.effect("follows i68-ignore comments on the line, the line before and the file", () =>
  Effect.gen(function* ignores() {
    const found = yield* Effect.forEach(IGNORED, (text) => linesOf(text), { concurrency: 1 });
    expect(Arr.flatten(found)).toStrictEqual([]);
  }),
);

it.effect("keeps what an ignore comment for another rule does not name", () =>
  Effect.gen(function* other() {
    const found = yield* linesOf(song("  lead: D6 1/1 // i68-ignore range/other"));
    expect(found).toStrictEqual(["/song.fumx:8:9 warn range/too-high lead is too high"]);
  }),
);

const isParseError = Str.includes("error i68/parse");

it.effect("reports a file that does not parse", () =>
  Effect.gen(function* parse() {
    const found = yield* linesOf("song");
    expect(pipe(found, Arr.every(isParseError))).toBe(true);
  }),
);

it.effect("fails when a rule names a plugin that is not configured", () =>
  Effect.gen(function* unknown() {
    const failure = yield* Effect.flip(linesOf(song(""), { rules: { "x/y": "warn" } }));
    expect(failure.message).toContain("x");
  }),
);
