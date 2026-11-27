import { expect, it } from "@effect/vitest";
import { lintText } from "@r_masseater/i68";
import type { Diagnostic, Plugin, RuleEntry, RuleOptions } from "@r_masseater/i68";
import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

const PATH = "/song.fumx";
const NAMESPACE = "under-test";

const HEADER = `song "test"

instrument keys sample "keys.flac" root C4

track lead instrument keys role melody
track counter instrument keys role countermelody
track pad instrument keys role harmony
track bass instrument keys role bass
track kit instrument keys role drums
track free instrument keys

`;

const HEADER_LINES = pipe(
  HEADER,
  Str.split(""),
  Arr.filter((char) => char === "\n"),
  Arr.length,
);

export interface RuleCase {
  readonly name: string;
  readonly song: string;
  readonly options?: RuleOptions;
}

export interface InvalidCase extends RuleCase {
  readonly errors: readonly string[];
}

export interface RuleCases {
  readonly plugin: Plugin;
  readonly rule: string;
  readonly valid: readonly RuleCase[];
  readonly invalid: readonly InvalidCase[];
}

const located = (diagnostic: Diagnostic): string =>
  pipe(
    Option.fromUndefinedOr(diagnostic.column),
    Option.match({
      onNone: () => `${String(diagnostic.line - HEADER_LINES)} ${diagnostic.message}`,
      onSome: (column) =>
        `${String(diagnostic.line - HEADER_LINES)}:${String(column)} ${diagnostic.message}`,
    }),
  );

const othersOff = (cases: RuleCases): Readonly<Record<string, "off">> =>
  pipe(
    Rec.keys(cases.plugin.rules),
    Arr.map((name): readonly [string, "off"] => [`${NAMESPACE}/${name}`, "off"]),
    Rec.fromEntries,
  );

const entryOf = (options: RuleOptions | undefined): RuleEntry =>
  pipe(
    Option.fromUndefinedOr(options),
    Option.match({
      onNone: (): RuleEntry => "warn",
      onSome: (some): RuleEntry => ["warn", some],
    }),
  );

type LintError = Effect.Error<ReturnType<typeof lintText>>;

const found = (cases: RuleCases, testCase: RuleCase): Effect.Effect<readonly string[], LintError> =>
  pipe(
    lintText({
      path: PATH,
      text: `${HEADER}${testCase.song}\n`,
      config: {
        plugins: { [NAMESPACE]: cases.plugin },
        rules: {
          ...othersOff(cases),
          [`${NAMESPACE}/${cases.rule}`]: entryOf(testCase.options),
        },
      },
    }),
    Effect.map(Arr.map(located)),
  );

export const ruleCases = (cases: RuleCases): void => {
  for (const testCase of cases.valid) {
    it.effect(`${cases.rule} allows ${testCase.name}`, () =>
      Effect.map(found(cases, testCase), (lines) => {
        expect(lines).toStrictEqual([]);
      }),
    );
  }
  for (const testCase of cases.invalid) {
    it.effect(`${cases.rule} flags ${testCase.name}`, () =>
      Effect.map(found(cases, testCase), (lines) => {
        expect(lines).toStrictEqual(testCase.errors);
      }),
    );
  }
};

const CHORDS: ReadonlyMap<string, readonly [string, string]> = new Map([
  ["C", ["C2", "[C3 E3 G3]"]],
  ["Dm", ["D2", "[D3 F3 A3]"]],
  ["Dm7", ["D2", "[C3 F3 A3]"]],
  ["Em", ["E2", "[E3 G3 B3]"]],
  ["E", ["E2", "[E3 G#3 B3]"]],
  ["E7", ["E2", "[D3 G#3 B3]"]],
  ["F", ["F2", "[C3 F3 A3]"]],
  ["FM7", ["F2", "[E3 A3 C4]"]],
  ["G", ["G2", "[D3 G3 B3]"]],
  ["G7", ["G2", "[D3 F3 B3]"]],
  ["Am", ["A2", "[C3 E3 A3]"]],
  ["Am7", ["A2", "[C3 G3 E4]"]],
  ["Cm7", ["C2", "[Eb3 G3 Bb3]"]],
  ["F7", ["F2", "[Eb3 A3 C4]"]],
  ["BbM7", ["Bb1", "[D3 F3 A3]"]],
  ["GM7", ["G2", "[F#3 B3 D4]"]],
  ["A7", ["A2", "[G3 C#4 E4]"]],
  ["F#m7", ["F#2", "[E3 A3 C#4]"]],
  ["Bm7", ["B2", "[D3 F#3 A3]"]],
]);

const bodyOf = (name: string): string => {
  const [bass, pad] = CHORDS.get(name) ?? ["C2", "[C3 E3 G3]"];
  return `\n  bass: ${bass} 1/1\n  pad: ${pad} 1/1\n}`;
};

export const chordBars = (names: readonly string[]): string =>
  pipe(
    names,
    Arr.map((name) => `bar {${bodyOf(name)}`),
    Arr.join("\n"),
    Str.replace("bar {", "bar meter 4/4 tempo 120bpm {"),
  );

export const songText = (body: string): string => `${HEADER}${body}\n`;
