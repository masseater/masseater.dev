import { expect, it } from "@effect/vitest";
import { readSong } from "@r_masseater/fumx-parser";
import { Effect, String as Str } from "effect";

import { compareWithMidi, midiToFumx } from "#/features/convert-midi/index.ts";

import { everyElement } from "./midi-to-fumx.test.support.ts";
import { convertMidiFile } from "./midi-to-fumx.ts";

const PATH = "/song.fumx";

it.effect("writes a .fumx that reproduces every MIDI event", () =>
  Effect.gen(function* everything() {
    const converted = yield* convertMidiFile({
      bytes: everyElement(),
      title: "fixture",
      path: PATH,
    });
    expect(converted.comparison.matches).toBe(true);
    expect({
      notes: converted.comparison.notes.expected,
      controls: converted.comparison.controls.expected,
      tempo: converted.comparison.tempo.expected,
      offGrid: converted.adjustments.offGrid,
    }).toStrictEqual({ notes: 17, controls: 13, tempo: 3, offGrid: 0 });
    for (const line of [
      'song "Every Element"',
      "track drums kit gm-drums role drums",
      'bar meter 4/4 tempo 120bpm mark "Intro" {',
      "  tempo: 120bpm 1/2, 150bpm 1/2",
      "  grand-piano-ch1.cc 64: rest 1/8, 127 3359/3840, 0 1/3840",
      "  grand-piano-ch1.bend: rest 1/4, +6st 13/3840, -12st 2867/3840",
      "  grand-piano-ch1.pressure C5: rest 3/4, 90 1/4",
      "  grand-piano-ch1.program: rest 1/2, 19 1/2",
      "  grand-piano-ch1: C5 1/4 vel 0.63 off 0.236, rest 3/4",
      "  grand-piano-ch1: G3 0/1 vel 0.315, rest 7/8",
      "  drums: bass-drum-1 1/16 vel 0.945, rest 3/16, acoustic-snare 1/16 vel 0.866, rest 9/16, crash-cymbal-1 1/8 tie",
    ]) {
      expect(Str.split(converted.text, "\n")).toContain(line);
    }
  }),
);

it.effect("finds a difference between the .fumx and the MIDI file", () =>
  Effect.gen(function* tampered() {
    const fumx = yield* midiToFumx({ bytes: everyElement(), title: "fixture" });
    const changed = Str.replace("127 3359/3840", "126 3359/3840")(fumx.text);
    const source = yield* readSong({ path: PATH, read: () => Effect.succeed(changed) });
    if (source.status === "invalid") {
      expect.unreachable();
    }
    const comparison = compareWithMidi({ plan: fumx.plan, bars: fumx.bars, song: source.song });
    expect(comparison.matches).toBe(false);
    expect(comparison.controls.missing).toStrictEqual(["grand-piano-ch1 cc 64 16128000 127"]);
    expect(comparison.controls.extra).toStrictEqual(["grand-piano-ch1 cc 64 16128000 126"]);
  }),
);
