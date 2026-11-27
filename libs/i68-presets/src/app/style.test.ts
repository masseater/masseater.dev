import { expect, it } from "@effect/vitest";
import { format, lintText } from "@r_masseater/i68";
import type { I68Config, I68Error } from "@r_masseater/i68";
import { Array as Arr, Effect, Record as Rec, pipe } from "effect";

import { bach, progressions, styleRules, stylePluginOf } from "./index.ts";
import type { StyleRules, StyleTable } from "./index.ts";

const PATH = "/song.fumx";

const song = (chords: readonly string[]): string => `song "test"

instrument keys sample "keys.flac" root C4

track pad instrument keys role harmony
track bass instrument keys role bass

bar meter 4/4 tempo 100bpm section verse {
${pipe(
  chords,
  Arr.map((chord) => `  pad: [${chord}] 1/1`),
  Arr.join("\n}\nbar {\n"),
)}
}
`;

const messagesOf = (text: string, config: I68Config): Effect.Effect<readonly string[], I68Error> =>
  pipe(
    lintText({ path: PATH, text, config }),
    Effect.map(Arr.map((diagnostic) => diagnostic.message)),
  );

const OUDOU = song([
  "F3 A3 C4",
  "G3 B3 D4",
  "E3 G3 B3",
  "A3 C4 E4",
  "F3 A3 C4",
  "G3 B3 D4",
  "C3 E3 G3",
]);
const MARUSA = song(["F3 A3 C4 E4", "E3 G#3 B3 D4", "A3 C4 E4 G4", "D3 F3 A3 C4", "C3 E3 G3"]);

it.effect("progressions names the progressions a song uses", () =>
  Effect.gen(function* named() {
    const oudou = yield* messagesOf(OUDOU, progressions());
    const marusa = yield* messagesOf(MARUSA, progressions());
    expect(oudou).toStrictEqual([
      "王道進行 (IV–V–IIIm–VIm) starts in bar 1",
      "小室進行 (VIm–IV–V–I) starts in bar 4",
    ]);
    expect(marusa).toStrictEqual([
      "丸サ進行 (Just the Two of Us) (IVM7–III7–VIm7) starts in bar 1",
    ]);
  }),
);

const USUAL = 9;
const RARE = 1;
const AFTER_CADENCE = 2;

const TABLE: StyleTable = {
  name: "test style",
  source: "test",
  order: 1,
  transitions: Rec.fromEntries([
    [
      "I",
      Rec.fromEntries([
        ["IV", USUAL],
        ["V", RARE],
      ]),
    ],
    ["V I", { IV: AFTER_CADENCE }],
  ]),
};

const STYLE: I68Config = {
  plugins: { style: stylePluginOf(TABLE) },
  rules: { "style/rare-transition": ["warn", { share: 0.2, seen: 5 }] },
};

it.effect(
  "a style table flags a change the style rarely makes and names what it does instead",
  () =>
    Effect.gen(function* rare() {
      const text = song(["C3 E3 G3", "G3 B3 D4", "C3 E3 G3", "F3 A3 C4"]);
      const found = yield* pipe(
        lintText({ path: PATH, text, config: STYLE }),
        Effect.map(Arr.map(format)),
      );
      expect(found).toStrictEqual([
        "/song.fumx:12:9 warn style/rare-transition I → V is rare in test style (10%) [test style usually goes to IV (90%), V (10%)]",
      ]);
    }),
);

it.effect("bach leaves a plain cadence alone", () =>
  Effect.gen(function* cadence() {
    const found = yield* messagesOf(song(["C3 E3 G3", "F3 A3 C4", "G3 B3 D4", "C3 E3 G3"]), bach());
    expect(found).toStrictEqual([]);
  }),
);

const RULES: StyleRules = {
  name: "test style",
  habits: [
    { context: "I", next: "IV", kind: "keep", aim: "softer turns", reason: "warm" },
    { context: "IV", next: "V", kind: "fix", aim: "fewer cadences" },
    { context: "V", next: "VIm", kind: "suggest", aim: "deceptive turns" },
  ],
};

const HABITS: I68Config = styleRules({ plugin: "mine", rules: RULES });

it.effect("style rules flag a kept habit the song skips and name the aim", () =>
  Effect.gen(function* kept() {
    const text = song(["C3 E3 G3", "F3 A3 C4", "C3 E3 G3", "G3 B3 D4", "C3 E3 G3"]);
    const found = yield* pipe(
      lintText({ path: PATH, text, config: HABITS }),
      Effect.map(Arr.map(format)),
    );
    expect(found).toStrictEqual([
      "/song.fumx:18:9 warn mine/keep test style goes I → IV here [softer turns: warm]",
      "/song.fumx:21:9 warn mine/suggest V → VIm would fit test style here [deceptive turns]",
    ]);
  }),
);

it.effect("style rules flag a habit being fixed and leave the kept ones alone", () =>
  Effect.gen(function* fixed() {
    const text = song(["C3 E3 G3", "F3 A3 C4", "G3 B3 D4", "A3 C4 E4"]);
    const found = yield* pipe(
      lintText({ path: PATH, text, config: HABITS }),
      Effect.map(Arr.map(format)),
    );
    expect(found).toStrictEqual([
      "/song.fumx:15:9 error mine/fix IV → V is a habit test style is fixing [fewer cadences]",
    ]);
  }),
);
