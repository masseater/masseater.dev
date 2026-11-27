import { expect, it } from "@effect/vitest";
import { format, lintText } from "@r_masseater/i68";
import type { I68Config } from "@r_masseater/i68";
import { Array as Arr, Effect, pipe } from "effect";

import { mixHabitsOf, styleSongFromText } from "./habits.ts";
import { styleRules } from "./index.ts";
import type { StyleRules } from "./index.ts";

const PATH = "/song.fumx";

const SONG = `song "mix"

instrument keys sample "keys.flac" root C4

bus verb
track pad instrument keys role harmony volume -6dB pan -50% send verb +30%
track bass instrument keys role bass

bar meter 4/4 tempo 100bpm section verse {
  pad: [C3 E3 G3] 1/1
  automate pad.volume -6dB -> -12dB over 1bar
}
bar section chorus {
  pad: [F3 A3 C4] 1/1
}
`;

const RULES: StyleRules = {
  name: "test style",
  habits: [
    { habit: { type: "pan", track: "pad", pan: -0.5 }, kind: "keep", aim: "wide pads" },
    { habit: { type: "pan", track: "pad", pan: 0 }, kind: "keep", aim: "centered pads" },
    {
      habit: { type: "move", track: "pad", parameter: "volume", direction: "down", edge: "before" },
      kind: "fix",
      aim: "build-ups",
    },
  ],
};

const MIX: I68Config = styleRules({ plugin: "mine", rules: RULES });

it.effect("mix rules check placement and the moves around a section change", () =>
  Effect.gen(function* mixed() {
    const found = yield* pipe(
      lintText({ path: PATH, text: SONG, config: MIX }),
      Effect.map(Arr.map(format)),
    );
    expect(found).toStrictEqual([
      "/song.fumx:10:9 warn mine/keep test style keeps pad pan 0% here [centered pads]",
      "/song.fumx:14:9 error mine/fix pad volume ↓ before section is a habit test style is fixing [build-ups]",
    ]);
  }),
);

it.effect("mix habits are what two or more songs share", () =>
  Effect.gen(function* shared() {
    const songs = yield* Effect.forEach(
      ["one", "two"],
      (name) => styleSongFromText({ name, text: SONG }),
      { concurrency: 1 },
    );
    const keys = pipe(
      mixHabitsOf({ songs, minSongs: 2 }),
      Arr.map((found) => `${found.key} (${String(found.songs)})`),
    );
    expect(keys).toStrictEqual(
      expect.arrayContaining([
        "pad pan -50% (2)",
        "pad send verb 30% (2)",
        "pad volume -6dB from loudest (2)",
        "pad volume ↓ before section (2)",
        "bass volume 0dB from loudest (2)",
      ]),
    );
  }),
);
