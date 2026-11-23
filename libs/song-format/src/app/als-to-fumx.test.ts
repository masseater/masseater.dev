import { readFileSync } from "node:fs";

import { expect, it } from "@effect/vitest";
import { Effect, Exit, String as Str } from "effect";

import { liveElevenSet } from "#/features/convert-als/model/live-set.test.support.ts";

import { convertLiveSetFile } from "./als-to-fumx.ts";

const PATH = "/song.fumx";

const dawtool = (file: string): Uint8Array =>
  readFileSync(new URL(`../features/convert-als/model/fixtures/dawtool/${file}`, import.meta.url));

it.effect("writes a .fumx that reproduces the clips, tempo, meters and locators", () =>
  Effect.gen(function* everything() {
    const bytes = liveElevenSet({
      tracks: [
        {
          name: "Keys",
          clips: [
            {
              start: 0,
              end: 8,
              loopStart: 0,
              loopEnd: 2,
              startRelative: 1,
              loopOn: true,
              notes: [
                { time: 0, duration: 0.5, key: 60, velocity: 90 },
                { time: 1, duration: 0.5, key: 64, velocity: 100.4, off: 30 },
                { time: 1.5, duration: 1, key: 67 },
              ],
            },
          ],
        },
        {
          name: "Bass",
          clips: [
            {
              start: 8,
              end: 11,
              loopStart: 1,
              loopEnd: 8,
              loopOn: false,
              notes: [
                { time: 0, duration: 1, key: 36 },
                { time: 1, duration: 1, key: 40 },
                { time: 2.5, duration: 4, key: 43, enabled: false },
                { time: 3, duration: 2, key: 45 },
              ],
            },
          ],
        },
      ],
      tempo: [
        [0, 120],
        [4, 120],
        [8, 140],
      ],
      meters: [
        [0, 4, 4],
        [8, 3, 4],
      ],
      locators: [
        [8, "Verse"],
        [0, "Intro"],
      ],
    });
    const converted = yield* convertLiveSetFile({ bytes, title: "fixture", path: PATH });
    expect(converted.comparison.matches).toBe(true);
    expect({
      notes: converted.comparison.notes.expected,
      marks: converted.comparison.marks.expected,
      offGrid: converted.adjustments.offGrid,
    }).toStrictEqual({ notes: 14, marks: 2, offGrid: 0 });
    for (const line of [
      'song "fixture"',
      "track keys instrument acoustic-grand-piano",
      "track bass instrument acoustic-grand-piano",
      'bar meter 4/4 tempo 120bpm mark "Intro" {',
      "  tempo: 120bpm -> 140bpm 1/1",
      'bar meter 3/4 mark "Verse" {',
    ]) {
      expect(Str.split(converted.text, "\n")).toContain(line);
    }
  }),
);

it.effect("reproduces the MIDI clips of sets saved by Live 8 and Live 9", () =>
  Effect.gen(function* older() {
    for (const [file, notes] of [
      ["live8/live8-patch-markers-auto.als", 1901],
      ["live9/live9-patch-markers-noauto.als", 1191],
    ] as const) {
      const converted = yield* convertLiveSetFile({
        bytes: dawtool(file),
        title: "dawtool",
        path: PATH,
      });
      expect([
        file,
        converted.comparison.matches,
        converted.comparison.notes.expected,
      ]).toStrictEqual([file, true, notes]);
    }
  }),
);

it.effect("rejects a file that is not a Live Set", () =>
  Effect.gen(function* junk() {
    const exit = yield* Effect.exit(
      convertLiveSetFile({ bytes: dawtool("junk.als"), title: "junk", path: PATH }),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  }),
);
