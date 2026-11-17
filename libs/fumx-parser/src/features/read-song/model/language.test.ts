import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { Note } from "tonal";

import type { Song } from "#/entities/song/index.ts";
import { fractionOf } from "#/shared/lib/ticks.ts";

import { ENTRY, filesOf, header, messagesOf, songIn, validSong } from "./read-song.test.support.ts";

const program = (body: string): string => `${header}\n${body}\n`;

const bassOf = (song: Song): readonly string[] =>
  pipe(
    song.notes,
    Arr.filter((note) => note.track === "bass"),
    Arr.map(
      (note) =>
        `${String(note.bar)} ${fractionOf(note.offset)} ${Note.fromMidi(note.midi)} ${fractionOf(note.length)}`,
    ),
  );

const keysOf = (song: Song): readonly string[] =>
  pipe(
    song.notes,
    Arr.filter((note) => note.track === "keys"),
    Arr.map((note) => `${String(note.bar)} ${Note.fromMidi(note.midi)} ${String(note.velocity)}`),
  );

it.effect("computes pitches and note values from let, lists and arithmetic", () =>
  Effect.gen(function* computed() {
    const song = yield* validSong(
      program(`let root: pitch = D2
let fifth = root + 7st
let beat = 1/4
bar meter 4/4 tempo 120bpm {
  bass: (root) (beat * 2), (fifth) (beat), (fifth - 12st) 1/4
}`),
    );
    expect(bassOf(song)).toStrictEqual(["1 0 D2 1/2", "1 1/2 A2 1/4", "1 3/4 A1 1/4"]);
  }),
);

it.effect("writes bars from functions, loops and branches", () =>
  Effect.gen(function* looped() {
    const song = yield* validSong(
      program(`fn walk(start: pitch, steps: number) {
  bar meter 4/4 tempo 120bpm {
    bass: each step in range(steps) { (start + step * 2st) 1/4 }
  }
}
for root in [C2, F2] {
  if root == C2 {
    walk(root, 4)
  } else {
    repeat 2 { walk(root, 4) }
  }
}`),
    );
    expect(
      pipe(
        song.bars,
        Arr.map((bar) => fractionOf(bar.start)),
      ),
    ).toStrictEqual(["0", "1/1", "2/1"]);
    expect(
      pipe(
        song.notes,
        Arr.map(
          (note) => `${String(note.bar)} ${fractionOf(note.offset)} ${Note.fromMidi(note.midi)}`,
        ),
      ),
    ).toStrictEqual([
      "1 0 C2",
      "1 1/4 D2",
      "1 1/2 E2",
      "1 3/4 Gb2",
      "2 0 F2",
      "2 1/4 G2",
      "2 1/2 A2",
      "2 3/4 B2",
      "3 0 F2",
      "3 1/4 G2",
      "3 1/2 A2",
      "3 3/4 B2",
    ]);
  }),
);

it.effect("runs recursion, while, assignment and return values", () =>
  Effect.gen(function* recursive() {
    const song = yield* validSong(
      program(`fn triangle(count: number): number {
  if count == 0 { return 0 }
  return count + triangle(count - 1)
}
fn chord(root: pitch): [pitch] {
  return [root, root + 4st, root + 7st]
}
let loud = 0
while loud < triangle(3) {
  loud = loud + 2
}
bar meter 4/4 tempo 120bpm {
  keys: (chord(C4)) 1/1 vel (loud / 10)
}`),
    );
    expect(keysOf(song)).toStrictEqual(["1 C4 0.6", "1 E4 0.6", "1 G4 0.6"]);
  }),
);

it.effect("brings in functions and constants from another file", () =>
  Effect.gen(function* importedCode() {
    const song = yield* songIn(
      filesOf({
        [ENTRY]: `import { octave, low } from "./theory.fumx"
${header}
bar meter 4/4 tempo 120bpm {
  bass: (octave(low)) 1/1
}
`,
        "/songs/theory.fumx": `let low = C1
fn octave(note: pitch): pitch {
  return note + 12st
}
`,
      }),
    );
    expect(bassOf(song)).toStrictEqual(["1 0 C2 1/1"]);
  }),
);

it.effect("reports type errors before running anything", () =>
  Effect.gen(function* typed() {
    const messages = yield* messagesOf(
      program(`let count: number = C4
fn up(note: pitch): pitch { return note + 1/4 }
if 3 { }
bar meter 4/4 tempo 120bpm {
  bass: ("C2") 1/1
}`),
    );
    expect(messages).toStrictEqual([
      "number が要るところに pitch があります",
      "pitch と duration に + は使えません",
      "bool が要るところに number があります",
      "音高か音高のリストが要るところに string があります",
    ]);
  }),
);

it.effect("stops a loop that never ends", () =>
  Effect.gen(function* endless() {
    const messages = yield* messagesOf(
      program(`let going = true
while going { going = true }`),
    );
    expect(
      pipe(
        messages,
        Arr.some((message) => pipe(message, Str.includes("上限"))),
      ),
    ).toBe(true);
  }),
);

it.effect("stops recursion that never ends", () =>
  Effect.gen(function* deep() {
    const messages = yield* messagesOf(
      program(`fn forever(count: number): number { return forever(count + 1) }
let never = forever(0)
bar meter 4/4 tempo 120bpm {
  bass: C2 1/1 vel (never)
}`),
    );
    expect(
      pipe(
        messages,
        Arr.some((message) => pipe(message, Str.includes("上限"))),
      ),
    ).toBe(true);
  }),
);
