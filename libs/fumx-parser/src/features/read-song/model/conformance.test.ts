import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Note } from "#/entities/song/index.ts";
import { fractionOf } from "#/shared/lib/ticks.ts";

import {
  ENTRY,
  filesOf,
  header,
  messagesOf,
  validSong,
  withLine,
} from "./read-song.test.support.ts";
import { readSong } from "./read-song.ts";

type NoteCase = readonly [string, string, readonly string[]];

const keysOf = (line: string): Effect.Effect<readonly Note[]> =>
  Effect.map(validSong(withLine(line)), (song) =>
    pipe(
      song.notes,
      Arr.filter((note) => note.track === "keys"),
    ),
  );

const pitchOf = (note: Note): string => `${String(note.midi)} ${String(note.cents)}`;

const PITCHES: readonly NoteCase[] = [
  ["the lowest MIDI note", "C-1", ["0 0"]],
  ["the highest MIDI note", "G9", ["127 0"]],
  ["middle C", "C4", ["60 0"]],
  ["concert A", "A4", ["69 0"]],
  ["B sharp, which belongs to the octave below", "B#3", ["60 0"]],
  ["C flat, which belongs to the octave above", "Cb4", ["59 0"]],
  ["E sharp", "E#4", ["65 0"]],
  ["F flat", "Fb4", ["64 0"]],
  ["a double sharp", "C##4", ["62 0"]],
  ["a double flat", "Dbb4", ["60 0"]],
  ["a flat in octave -1", "Bb-1", ["10 0"]],
  ["a pitch raised by cents", "C4+50c", ["60 50"]],
  ["a pitch lowered by cents", "C4-25c", ["60 -25"]],
];

for (const [name, pitch, expected] of PITCHES) {
  it.effect(`reads ${name} as its MIDI number`, () =>
    Effect.map(keysOf(`  keys: ${pitch} 1/1`), (notes) => {
      expect(pipe(notes, Arr.map(pitchOf))).toStrictEqual(expected);
    }),
  );
}

const timingOf = (note: Note): string => `${fractionOf(note.offset)}+${fractionOf(note.length)}`;

const TIMINGS: readonly NoteCase[] = [
  [
    "a triplet of eighths in the time of two",
    "  keys: tuplet 3:2 { C4 1/8, D4 1/8, E4 1/8 }, rest 3/4",
    ["0+1/12", "1/12+1/12", "1/6+1/12"],
  ],
  [
    "a quintuplet of sixteenths in the time of four",
    "  keys: tuplet 5:4 { C4 1/16, D4 1/16, E4 1/16, F4 1/16, G4 1/16 }, rest 3/4",
    ["0+1/20", "1/20+1/20", "1/10+1/20", "3/20+1/20", "1/5+1/20"],
  ],
  [
    "a triplet nested in a triplet",
    "  keys: tuplet 3:2 { tuplet 3:2 { C4 1/16, D4 1/16, E4 1/16 }, F4 1/8, G4 1/8 }, rest 3/4",
    ["0+1/36", "1/36+1/36", "1/18+1/36", "1/12+1/12", "1/6+1/12"],
  ],
  [
    "a dotted value written as a fraction",
    "  keys: C4 3/8, D4 1/8, E4 1/2",
    ["0+3/8", "3/8+1/8", "1/2+1/2"],
  ],
  ["a chord, whose notes start together", "  keys: [C4 E4 G4] 1/1", ["0+1/1", "0+1/1", "0+1/1"]],
];

for (const [name, line, expected] of TIMINGS) {
  it.effect(`places ${name}`, () =>
    Effect.map(keysOf(line), (notes) => {
      expect(pipe(notes, Arr.map(timingOf))).toStrictEqual(expected);
    }),
  );
}

const attributesOf = (note: Note): string =>
  Arr.join(
    [
      `vel ${String(note.velocity)}`,
      `gate ${String(note.gate)}`,
      `off ${pipe(
        note.releaseVelocity,
        Option.map(String),
        Option.getOrElse(() => "-"),
      )}`,
      `art ${pipe(
        note.articulation,
        Option.getOrElse(() => "-"),
      )}`,
    ],
    " ",
  );

const ATTRIBUTES: readonly NoteCase[] = [
  ["a velocity", "  keys: C4 1/1 vel 0.5", ["vel 0.5 gate 1 off - art -"]],
  ["the loudest velocity", "  keys: C4 1/1 vel 1", ["vel 1 gate 1 off - art -"]],
  ["a gate length", "  keys: C4 1/1 gate 50%", ["vel 1 gate 0.5 off - art -"]],
  ["a release velocity", "  keys: C4 1/1 off 0.25", ["vel 1 gate 1 off 0.25 art -"]],
  ["staccato", "  keys: C4 1/1 staccato", ["vel 1 gate 1 off - art staccato"]],
];

for (const [name, line, expected] of ATTRIBUTES) {
  it.effect(`reads ${name}`, () =>
    Effect.map(keysOf(line), (notes) => {
      expect(pipe(notes, Arr.map(attributesOf))).toStrictEqual(expected);
    }),
  );
}

const PROBLEMS: readonly (readonly [string, string])[] = [
  ["a pitch above the highest MIDI note", "  keys: G#9 1/1"],
  ["a pitch below the lowest MIDI note", "  keys: Cb-1 1/1"],
  ["a velocity above 1", "  keys: C4 1/1 vel 1.5"],
  ["a velocity of 0, which MIDI reads as a note off", "  keys: C4 1/1 vel 0"],
  ["a gate above 100%", "  keys: C4 1/1 gate 150%"],
  ["a gate of 0%", "  keys: C4 1/1 gate 0%"],
  ["a release velocity above 1", "  keys: C4 1/1 off 2"],
  ["a note value with a zero denominator", "  keys: C4 1/0"],
  ["a line longer than the bar", "  keys: C4 1/1, D4 1/4"],
  ["a tuplet ratio of zero", "  keys: tuplet 0:2 { C4 1/4 }, rest 3/4"],
  ["a chord that names the same pitch twice", "  keys: [C4 C4] 1/1"],
];

for (const [name, line] of PROBLEMS) {
  it.effect(`reports ${name}`, () =>
    Effect.map(messagesOf(withLine(line)), (messages) => {
      expect(messages).not.toStrictEqual([]);
    }),
  );
}

const tiny = (body: string): string => `song "t"
instrument keys sample "keys.flac" root C4
track keys instrument keys
bar meter 4/4 tempo 120bpm {
${body}
}
`;

const issuesOf = (text: string): Effect.Effect<readonly string[]> =>
  Effect.map(readSong(filesOf({ [ENTRY]: text })), (source) => {
    if (source.status === "valid") {
      return [];
    }
    return pipe(
      source.issues,
      Arr.map((issue) => `${String(issue.line)}:${String(issue.column)} ${issue.message}`),
    );
  });

const PLACED_PROBLEMS: readonly (readonly [string, string, readonly string[]])[] = [
  [
    "a velocity above 1 at its value",
    "  keys: C4 1/2 vel 1.5, D4 1/2",
    ["5:20 vel は 0 より大きく 1 以下で書きます"],
  ],
  [
    "a pitch repeated in a chord at the repeated note",
    "  keys: [C4 E4 C4] 1/1",
    ["5:16 C4 と同じ高さの音が和音にもうあります"],
  ],
  [
    "the same pitch spelled two ways in a chord",
    "  keys: [C4 B#3] 1/1",
    ["5:13 B#3 と同じ高さの音が和音にもうあります"],
  ],
  [
    "a gate of 0% at its amount",
    "  keys: C4 1/1 gate 0%",
    ["5:21 gate は 0% より大きく 100% 以下で書きます"],
  ],
];

for (const [name, body, expected] of PLACED_PROBLEMS) {
  it.effect(`reports ${name}`, () =>
    Effect.map(issuesOf(tiny(body)), (issues) => {
      expect(issues).toStrictEqual(expected);
    }),
  );
}

it.effect("joins a note tied across three bars into one", () =>
  Effect.gen(function* tied() {
    const song = yield* validSong(`${header}
bar meter 4/4 tempo 120bpm {
  keys: C4 1/1 tie
}
bar {
  keys: C4 1/1 tie
}
bar {
  keys: C4 1/2, rest 1/2
}
`);
    const notes = pipe(
      song.notes,
      Arr.filter((note) => note.track === "keys"),
      Arr.map(timingOf),
    );
    expect(notes).toStrictEqual(["0+5/2"]);
  }),
);

it.effect("reads lyrics, melismas and bends", () =>
  Effect.gen(function* sung() {
    const notes = yield* keysOf(
      '  keys: C4 1/4 lyric "la", D4 1/4 lyric _, E4 1/2 bend 0ms:0st 100ms:+2st',
    );
    expect(
      pipe(
        notes,
        Arr.map((note) => ({ lyric: note.lyric, bend: note.bend })),
      ),
    ).toStrictEqual([
      { lyric: Option.some({ kind: "syllable", text: "la" }), bend: [] },
      { lyric: Option.some({ kind: "melisma" }), bend: [] },
      {
        lyric: Option.none(),
        bend: [
          { milliseconds: 0, semitones: 0 },
          { milliseconds: 100, semitones: 2 },
        ],
      },
    ]);
  }),
);

it.effect("writes notes from each over a list and computed rests", () =>
  Effect.gen(function* computed() {
    const notes = yield* keysOf("  keys: each p in [C4, E4, G4] { (p) 1/4 }, rest (1/8 + 1/8)");
    expect(pipe(notes, Arr.map(pitchOf))).toStrictEqual(["60 0", "64 0", "67 0"]);
  }),
);

it.effect(
  "ramps the tempo across the bars it spans and keeps sections where they are written",
  () =>
    Effect.gen(function* bars() {
      const song = yield* validSong(`${header}
bar meter 6/8 tempo 90bpm -> 120bpm over 2bar section intro mark "A" {
  keys: C4 3/4
}
bar meter 3/4 {
  keys: C4 3/4
}
bar {
  keys: C4 3/4
}
`);
      expect(
        pipe(
          song.bars,
          Arr.map(
            (bar) =>
              `${fractionOf(bar.length)} ${String(bar.meter.numerator)}/${String(bar.meter.denominator)} ${String(bar.tempo.bpm)} ${Option.getOrElse(bar.section, () => "-")} ${Option.getOrElse(bar.mark, () => "-")}`,
          ),
        ),
      ).toStrictEqual(["3/4 6/8 90 intro A", "3/4 3/4 105 - -", "3/4 3/4 120 - -"]);
    }),
);
