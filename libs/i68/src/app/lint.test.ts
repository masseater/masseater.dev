import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Record as Rec, String as Str, pipe } from "effect";

import type { I68Config } from "#/shared/config/index.ts";
import { I68Error } from "#/shared/lib/errors.ts";

import { format } from "./format.ts";
import { CONFIG, extra, linesOf, linesWith, range, song } from "./lint.test.support.ts";
import { lint } from "./lint.ts";
import { i68Section, songPathspecs } from "./section.ts";

const HIGH = "lead is too high [Move it down an octave]";

it.effect("reports what a rule finds with the configured severity and position", () =>
  Effect.gen(function* severity() {
    const found = yield* linesOf(song("  lead: C4 1/2, D6 1/2"));
    expect(found).toStrictEqual([`/song.fumx:8:17 warn range/too-high ${HIGH}`]);
  }),
);

it.effect("turns a rule on as an error when the config does not name it", () =>
  Effect.gen(function* fallback() {
    const found = yield* linesWith({ plugins: { range } })(song("  lead: D6 1/1"));
    expect(found).toStrictEqual([`/song.fumx:8:9 error range/too-high ${HIGH}`]);
  }),
);

const SETTINGS: readonly (readonly [string, I68Config, readonly string[]])[] = [
  [
    "a severity in a tuple",
    { plugins: { range }, rules: { "range/too-high": ["warn"], "range/too-low": "off" } },
    [`/song.fumx:8:9 warn range/too-high ${HIGH}`],
  ],
  [
    "options that let the note through",
    {
      plugins: { range },
      rules: { "range/too-high": ["error", { max: 90 }], "range/too-low": "off" },
    },
    [],
  ],
  [
    "options that still catch the note",
    {
      plugins: { range },
      rules: { "range/too-high": ["error", { max: 80 }], "range/too-low": "off" },
    },
    [`/song.fumx:8:9 error range/too-high ${HIGH}`],
  ],
  [
    "a later severity that keeps the options set before it",
    {
      extends: [{ plugins: { range }, rules: { "range/too-high": ["warn", { max: 90 }] } }],
      rules: { "range/too-high": "error", "range/too-low": "off" },
    },
    [],
  ],
  [
    "later options that replace the earlier ones",
    {
      extends: [{ plugins: { range }, rules: { "range/too-high": ["warn", { max: 90 }] } }],
      rules: { "range/too-high": ["error", { max: 80 }], "range/too-low": "off" },
    },
    [`/song.fumx:8:9 error range/too-high ${HIGH}`],
  ],
  [
    "a later extended config over an earlier one",
    {
      extends: [CONFIG, { rules: { "range/too-high": "error" } }],
    },
    [`/song.fumx:8:9 error range/too-high ${HIGH}`],
  ],
  [
    "the config's own rules over every extended config",
    {
      extends: [CONFIG, { rules: { "range/too-high": "error" } }],
      rules: { "range/too-high": "off" },
    },
    [],
  ],
];

for (const [name, config, expected] of SETTINGS) {
  it.effect(`follows ${name}`, () =>
    Effect.map(linesWith(config)(song("  lead: D6 1/1")), (found) => {
      expect(found).toStrictEqual(expected);
    }),
  );
}

it.effect("does not run a rule that is off", () =>
  Effect.gen(function* off() {
    const config: I68Config = {
      extends: [CONFIG],
      plugins: { extra },
      rules: { "extra/broken": "off", "extra/bars": "off" },
    };
    const found = yield* linesWith(config)(song("  lead: C4 1/1"));
    expect(found).toStrictEqual([]);
  }),
);

it.effect("fails with the rule's name when a rule throws", () =>
  Effect.gen(function* broken() {
    const config: I68Config = { plugins: { extra }, rules: { "extra/bars": "off" } };
    const failure = yield* Effect.flip(linesWith(config)(song("  lead: C4 1/1")));
    expect(failure).toBeInstanceOf(I68Error);
    expect(failure.message).toBe("extra/broken failed: Error: boom");
  }),
);

it.effect("sorts what every rule finds by line and then column", () =>
  Effect.gen(function* sorted() {
    const config: I68Config = {
      extends: [CONFIG],
      plugins: { extra },
      rules: { "extra/broken": "off", "extra/bars": "warn" },
    };
    const found = yield* linesWith(config)(song("  lead: C2 1/2, D6 1/2"));
    expect(found).toStrictEqual([
      "/song.fumx:1 warn extra/bars 1 bars",
      "/song.fumx:8:9 warn range/too-low lead is too low",
      `/song.fumx:8:17 warn range/too-high ${HIGH}`,
    ]);
  }),
);

it.effect("fails when a rule names a plugin that is not configured", () =>
  Effect.gen(function* unknownPlugin() {
    const failure = yield* Effect.flip(linesWith({ rules: { "x/y": "warn" } })(song("")));
    expect(failure.message).toBe("rules name plugins that are not configured: x");
  }),
);

it.effect("fails when a rule names a rule its plugin does not have", () =>
  Effect.gen(function* unknownRule() {
    const failure = yield* Effect.flip(
      linesWith({ plugins: { range }, rules: { "range/nope": "warn" } })(song("")),
    );
    expect(failure.message).toBe("rules name rules that their plugins do not have: range/nope");
  }),
);

const isParseError = Str.includes(" error i68/parse ");
const onLine8 = Str.startsWith("/song.fumx:8:");

it.effect("reports a file that does not parse at the problem and runs no rule on it", () =>
  Effect.gen(function* parse() {
    const found = yield* linesOf(song("  lead: D6 1/1, H4"));
    expect(Arr.isReadonlyArrayNonEmpty(found)).toBe(true);
    expect(pipe(found, Arr.every(isParseError))).toBe(true);
    expect(pipe(found, Arr.every(onLine8))).toBe(true);
  }),
);

const FILES: Readonly<Record<string, string>> = {
  "/repo/a.fumx": song("  lead: D6 1/1"),
  "/repo/songs/b.fumx": song("  lead: C4 1/2, D6 1/2"),
};

const readFile = (path: string): Effect.Effect<string, I68Error> =>
  Effect.fromOption(Rec.get(FILES, path)).pipe(
    Effect.mapError(() => I68Error.make({ message: `could not read ${path}` })),
  );

const formattedIn = (files: readonly string[]): Effect.Effect<readonly string[], I68Error> =>
  pipe(lint({ root: "/repo", files, read: readFile, config: CONFIG }), Effect.map(Arr.map(format)));

it.effect("lints files under a root and names each by its path from the root", () =>
  Effect.gen(function* files() {
    const found = yield* formattedIn(["songs/b.fumx", "a.fumx"]);
    expect(found).toStrictEqual([
      `a.fumx:8:9 warn range/too-high ${HIGH}`,
      `songs/b.fumx:8:17 warn range/too-high ${HIGH}`,
    ]);
  }),
);

it.effect("reports a file it cannot read as a parse error", () =>
  Effect.gen(function* missing() {
    const found = yield* formattedIn(["gone.fumx"]);
    expect(found).toStrictEqual(["gone.fumx:1:1 error i68/parse ファイルを読めません"]);
  }),
);

it("reads the i68 section of the Vite config with its extended configs merged", () => {
  expect(i68Section({})).toStrictEqual({});
  expect(i68Section({ i68: { extends: [CONFIG], ignores: ["drafts/**"] } })).toStrictEqual({
    plugins: { range },
    rules: { "range/too-high": "warn", "range/too-low": "warn" },
    ignores: ["drafts/**"],
  });
});

it("lists the songs git should find without the ignored ones", () => {
  expect(songPathspecs({ config: { ignores: ["drafts/**"] } })).toStrictEqual([
    "*.fumx",
    ":(glob,exclude)drafts/**",
  ]);
  expect(songPathspecs({ config: {}, patterns: ["songs/"] })).toStrictEqual(["songs/"]);
});
