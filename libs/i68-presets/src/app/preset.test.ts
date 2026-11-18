import { expect, it } from "@effect/vitest";
import { format, lintText } from "@r_masseater/i68";
import type { I68Config, I68Error } from "@r_masseater/i68";
import { Array as Arr, Effect, pipe } from "effect";

import { classical, pop, recommended, voicing } from "./index.ts";

const PATH = "/song.fumx";

const song = (bars: string): string => `song "test"

instrument keys sample "keys.flac" root C4

track lead instrument keys role melody
track pad instrument keys role harmony
track bass instrument keys role bass

${bars}
`;

const rulesOf = (text: string, config: I68Config): Effect.Effect<readonly string[], I68Error> =>
  pipe(
    lintText({ path: PATH, text, config }),
    Effect.map(Arr.map((diagnostic) => diagnostic.rule)),
  );

const linesOf = (text: string, config: I68Config): Effect.Effect<readonly string[], I68Error> =>
  pipe(lintText({ path: PATH, text, config }), Effect.map(Arr.map(format)));

const CLEAN = song(`bar meter 4/4 tempo 120bpm {
  lead: E4 1/4, D4 1/4, C4 1/2
  pad:  [C3 E3 G3] 1/1
  bass: C2 1/1
}
bar {
  lead: B4 1/4, A4 1/4, G4 1/2
  pad:  [D3 G3 B3] 1/1
  bass: G1 1/1
}`);

it.effect("finds nothing in a plain progression", () =>
  Effect.gen(function* clean() {
    const found = yield* linesOf(CLEAN, { extends: [recommended(), classical()] });
    expect(found).toStrictEqual([]);
  }),
);

it.effect("pop flags a note outside the key and the chord", () =>
  Effect.gen(function* outOfKey() {
    const text = song(`bar meter 4/4 tempo 120bpm {
  lead: E4 1/4, D#4 1/4, C4 1/2
  pad:  [C3 E3 G3] 1/1
  bass: C2 1/1
}`);
    const found = yield* linesOf(text, pop());
    expect(found).toStrictEqual([
      "/song.fumx:10:17 warn pop/out-of-key Eb4 in lead is outside C major and the chord under it [Move it a semitone, or ignore the line if the borrowed note is intended]",
    ]);
  }),
);

it.effect("pop flags a part outside its range and a leap over an octave", () =>
  Effect.gen(function* range() {
    const text = song(`bar meter 4/4 tempo 120bpm {
  lead: C4 1/2, D6 1/2
  bass: C2 1/1
}`);
    const found = yield* rulesOf(text, pop());
    expect(found).toStrictEqual(["pop/part-range", "pop/melody-leap"]);
  }),
);

it.effect("pop takes ranges per track", () =>
  Effect.gen(function* ranges() {
    const text = song(`bar meter 4/4 tempo 120bpm {
  lead: A4 1/1
}`);
    const found = yield* rulesOf(text, pop({ ranges: { lead: ["C3", "G4"] } }));
    expect(found).toStrictEqual(["pop/part-range"]);
  }),
);

it.effect("pop flags a sung line with no rest", () =>
  Effect.gen(function* breath() {
    const text = song(`bar meter 4/4 tempo 60bpm {
  lead: C4 1/1
}
bar {
  lead: D4 1/1
}
bar {
  lead: E4 1/1
}`);
    const found = yield* rulesOf(text, pop());
    expect(found).toStrictEqual(["pop/breath"]);
  }),
);

it.effect("pop lets each rest start a new phrase", () =>
  Effect.gen(function* rests() {
    const text = song(`bar meter 4/4 tempo 60bpm {
  lead: C4 3/4, rest 1/4
}
bar {
  lead: D4 3/4, rest 1/4
}
bar {
  lead: E4 3/4, rest 1/4
}
bar {
  lead: F4 3/4, rest 1/4
}`);
    const found = yield* rulesOf(text, pop());
    expect(found).toStrictEqual([]);
  }),
);

it.effect(
  "voicing flags clashes, low intervals, crowded low mids and chords above the melody",
  () =>
    Effect.gen(function* voicings() {
      const text = song(`bar meter 4/4 tempo 120bpm {
  lead: C5 1/1
  pad:  [B4 D5] 1/1
}
bar {
  pad:  [C3 D3 G3 A3] 1/1
  bass: C2 1/1
}`);
      const found = yield* rulesOf(text, voicing());
      expect(Arr.dedupe(found)).toStrictEqual([
        "voicing/semitone-clash",
        "voicing/chord-above-melody",
        "voicing/low-interval-limit",
        "voicing/crowded-low-mids",
      ]);
    }),
);

it.effect("voicing flags chord voices that leap", () =>
  Effect.gen(function* leaps() {
    const text = song(`bar meter 4/4 tempo 120bpm {
  pad: [C4 E4 G4] 1/2, [A4 C#5 E5] 1/2
}`);
    const found = yield* rulesOf(text, voicing());
    expect(found).toStrictEqual(["voicing/voice-jump"]);
  }),
);

it.effect("classical flags parallel fifths and a dissonance that does not resolve", () =>
  Effect.gen(function* parallels() {
    const text = song(`bar meter 4/4 tempo 120bpm {
  lead: G4 1/2, A4 1/2
  bass: C3 1/2, D3 1/2
}
bar {
  lead: F4 1/2, G4 1/2
  bass: C3 1/1
}`);
    const found = yield* rulesOf(text, classical());
    expect(found).toStrictEqual(["classical/parallel-perfects", "classical/unresolved-dissonance"]);
  }),
);
