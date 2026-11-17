import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Control } from "#/entities/song/index.ts";
import { fractionOf } from "#/shared/lib/ticks.ts";

import { header, messagesOf, validSong, withLine } from "./read-song.test.support.ts";

const nameOf = (controller: Control["controller"]): string => {
  if (controller.kind === "cc") {
    return `cc ${String(controller.number)}`;
  }
  if (controller.kind === "pressure") {
    return Option.match(controller.midi, {
      onNone: () => "pressure",
      onSome: (midi) => `pressure ${String(midi)}`,
    });
  }
  return controller.kind;
};

const describe = (control: Control): string => {
  const target = Option.match(control.target, {
    onNone: () => "",
    onSome: (value) => ` -> ${String(value)}`,
  });
  return `${control.track} ${nameOf(control.controller)} ${fractionOf(control.start)} ${String(control.value)}${target}`;
};

it.effect("reads controller lines as events at their place in the bar", () =>
  Effect.gen(function* controllers() {
    const song = yield* validSong(`${header}
bar meter 4/4 tempo 120bpm {
  keys: C4 1/1
  keys.cc 64: rest 1/4, 127 1/2, 0 1/4
  keys.bend: +0.5st 1/4, -2st -> 0st 3/4
  keys.pressure: 40 1/1
  keys.pressure C4: 90 1/1
  keys.program: rest 3/4, 19 1/4
}
bar {
  keys.cc 64: 64 1/1
}
`);
    expect(pipe(song.controls, Arr.map(describe))).toStrictEqual([
      "keys cc 64 1/4 127",
      "keys cc 64 3/4 0",
      "keys bend 0 0.5",
      "keys bend 1/4 -2 -> 0",
      "keys pressure 0 40",
      "keys pressure 60 0 90",
      "keys program 3/4 19",
      "keys cc 64 1/1 64",
    ]);
  }),
);

it.effect("reports controller values outside their range or unit", () =>
  Effect.gen(function* ranges() {
    const messages = yield* Effect.forEach(
      [
        "  keys.cc 128: 1 1/1",
        "  keys.cc 7: 200 1/1",
        "  keys.bend: 3 1/1",
        "  keys.program: 1 -> 2 1/1",
        "  keys.cc 1: 3 1/2",
      ],
      (line) => messagesOf(withLine(line)),
      { concurrency: 1 },
    );
    expect(messages).toStrictEqual([
      ["cc の番号は 0 から 127 の整数で書きます"],
      ["cc の値は 0 から 127 の整数で書きます"],
      ["bend の値は半音（例: +0.5st）で書きます"],
      ["program は -> で変化させられません"],
      ["keys.cc 1 の合計は 1/2 で、この小節の 1/1 に 1/2 足りません"],
    ]);
  }),
);

it.effect("changes tempo inside a bar and carries the last tempo on", () =>
  Effect.gen(function* tempo() {
    const song = yield* validSong(`${header}
bar meter 4/4 {
  tempo: 120bpm 1/2, 140bpm -> 150bpm 1/2
  keys: C4 1/1
}
bar {
  keys: C4 1/1
}
`);
    expect(
      pipe(
        song.bars,
        Arr.map((bar) => String(bar.tempo.bpm)),
      ),
    ).toStrictEqual(["120", "150"]);
    expect(
      pipe(
        song.bars,
        Arr.flatMap((bar) => bar.tempoSteps),
        Arr.map(
          (step) =>
            `${fractionOf(step.offset)} ${String(step.bpm)} ${String(Option.getOrNull(step.target))}`,
        ),
      ),
    ).toStrictEqual(["0 120 null", "1/2 140 150"]);
  }),
);

it.effect("does not take a header tempo and a tempo line in the same bar", () =>
  Effect.gen(function* doubled() {
    const messages = yield* messagesOf(`${header}
bar meter 4/4 tempo 120bpm {
  tempo: 120bpm 1/2, 130bpm 1/2
}
`);
    expect(messages).toStrictEqual(["小節の頭の tempo と tempo の行は片方だけ書きます"]);
  }),
);

it.effect("keeps release velocity and ties hits across the bar line", () =>
  Effect.gen(function* release() {
    const song = yield* validSong(`${header}
bar meter 4/4 tempo 120bpm {
  keys: C4 1/2 off 0.5, D4 1/2 tie
  drums: rest 3/4, kick 1/4 vel 0.5 tie
}
bar {
  keys: D4 1/4 off 0.25, rest 3/4
  drums: kick 1/4 off 0.75, snare 0/1, rest 3/4
}
`);
    expect(
      pipe(
        song.notes,
        Arr.map(
          (note) => `${fractionOf(note.length)} ${String(Option.getOrNull(note.releaseVelocity))}`,
        ),
      ),
    ).toStrictEqual(["1/2 0.5", "3/4 0.25"]);
    expect(
      pipe(
        song.hits,
        Arr.map(
          (hit) =>
            `${hit.voice} ${fractionOf(hit.length)} ${String(hit.velocity)} ${String(Option.getOrNull(hit.releaseVelocity))}`,
        ),
      ),
    ).toStrictEqual(["kick 1/2 0.5 0.75", "snare 0 1 null"]);
  }),
);
