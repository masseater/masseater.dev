import { Array as Arr, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import type { NoteEvent, Structure } from "./song.ts";
import { RULER_HEIGHT, eventsBetween, sessionOf } from "./tracks.ts";

const STRUCTURE: Structure = {
  tempo: 120,
  swing: 0.5,
  bars: 4,
  tail: 0,
  sections: [{ name: "all", from: 0, to: 4 }],
  marks: [{ bar: 0, label: "start" }],
  tracks: [
    { name: "DRUMS", hue: 52, tone: "full" },
    { name: "BASS", hue: 262, tone: "full" },
  ],
};

const placed = { duration: 0.5, gain: 1, offset: 0, reversed: false } as const;

const EVENTS: readonly NoteEvent[] = [
  { ...placed, kind: "note", track: "EXTRA", sample: "bell", start: 3, pitch: 72, glide: [] },
  { ...placed, kind: "note", track: "BASS", sample: "sub", start: 2, pitch: 36, glide: [] },
  { ...placed, kind: "hit", track: "DRUMS", sample: "kick", start: 1 },
  { ...placed, kind: "hit", track: "DRUMS", sample: "kick", start: 0 },
  { ...placed, kind: "hit", track: "DRUMS", sample: "hat", start: 0.25 },
];

const WINDOW = { from: 1.2, to: 1.3 } as const;
const NONE = 0;

const session = sessionOf(STRUCTURE)({ events: EVENTS, automation: [], roots: [] });

describe("a session", () => {
  it("orders tracks as the song lists them and puts unknown tracks last", () => {
    expect(
      pipe(
        session.tracks,
        Arr.map((track) => track.name),
      ),
    ).toStrictEqual(["DRUMS", "BASS", "EXTRA"]);
  });

  it("stacks tracks under the ruler", () => {
    const tops = pipe(
      session.tracks,
      Arr.map((track) => track.top),
    );
    const heights = pipe(
      session.tracks,
      Arr.map((track) => track.height),
    );
    expect(Arr.head(tops)).toStrictEqual(Arr.head([RULER_HEIGHT]));
    expect(session.height).toBe(
      RULER_HEIGHT + Arr.reduce(heights, NONE, (sum, height) => sum + height),
    );
  });

  it("tells pitched tracks from tracks of one-shots", () => {
    expect(
      pipe(
        session.tracks,
        Arr.map((track) => track.pitched),
      ),
    ).toStrictEqual([false, true, true]);
    expect(
      pipe(
        session.tracks,
        Arr.flatMap((track) => track.rows),
      ),
    ).toStrictEqual(["kick", "hat"]);
  });

  it("finds events that still sound inside a window", () => {
    const sounding = pipe(
      session.tracks,
      Arr.flatMap(eventsBetween(WINDOW)),
      Arr.map((event) => `${event.sample}@${event.start}`),
    );
    expect(sounding).toStrictEqual(["kick@1"]);
  });
});
