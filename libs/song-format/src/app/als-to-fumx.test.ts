import { NodeFileSystem, NodePath } from "@effect/platform-node-shared";
import { expect, layer } from "@effect/vitest";
import { Effect, Exit, FileSystem, Layer, Path, String as Str, pipe } from "effect";

import { liveElevenSet } from "./als-to-fumx.test.support.ts";
import type { SetSpec } from "./als-to-fumx.test.support.ts";
import { convertLiveSetFile } from "./als-to-fumx.ts";

const PATH = "/song.fumx";

const files = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

const dawtool = Effect.fn("dawtool")(function* dawtool(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const fixture = yield* path.fromFileUrl(
    new URL(`../features/convert-als/model/fixtures/dawtool/${file}`, import.meta.url),
  );
  return yield* fileSystem.readFile(fixture);
});

const KEYS = {
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
};

const BASS = {
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
};

const SET: SetSpec = {
  tracks: [KEYS, BASS],
  tempo: [
    { beat: 0, bpm: 120 },
    { beat: 4, bpm: 120 },
    { beat: 8, bpm: 140 },
  ],
  meters: [
    { beat: 0, numerator: 4, denominator: 4 },
    { beat: 8, numerator: 3, denominator: 4 },
  ],
  locators: [
    { beat: 8, name: "Verse" },
    { beat: 0, name: "Intro" },
  ],
};

const OLDER = [
  { file: "live8/live8-patch-markers-auto.als", notes: 1901 },
  { file: "live9/live9-patch-markers-noauto.als", notes: 1191 },
];

layer(files)("Ableton Live Sets", (it) => {
  it.effect("writes a .fumx that reproduces the clips, tempo, meters and locators", () =>
    Effect.gen(function* everything() {
      const bytes = yield* liveElevenSet(SET);
      const converted = yield* convertLiveSetFile({ bytes, title: "fixture", path: PATH });
      expect({
        matches: converted.comparison.matches,
        notes: converted.comparison.notes.expected,
        marks: converted.comparison.marks.expected,
        offGrid: converted.adjustments.offGrid,
      }).toStrictEqual({ matches: true, notes: 14, marks: 2, offGrid: 0 });
      const lines = pipe(converted.text, Str.split("\n"));
      for (const line of [
        'song "fixture"',
        "track keys instrument acoustic-grand-piano",
        "track bass instrument acoustic-grand-piano",
        'bar meter 4/4 tempo 120bpm mark "Intro" {',
        "  tempo: 120bpm -> 140bpm 1/1",
        'bar meter 3/4 mark "Verse" {',
      ]) {
        expect(lines).toContain(line);
      }
    }),
  );

  it.effect("reproduces the MIDI clips of sets saved by Live 8 and Live 9", () =>
    Effect.gen(function* older() {
      for (const { file, notes } of OLDER) {
        const bytes = yield* dawtool(file);
        const converted = yield* convertLiveSetFile({ bytes, title: "dawtool", path: PATH });
        expect({
          file,
          matches: converted.comparison.matches,
          notes: converted.comparison.notes.expected,
        }).toStrictEqual({ file, matches: true, notes });
      }
    }),
  );

  it.effect("rejects a file that is not a Live Set", () =>
    Effect.gen(function* junk() {
      const bytes = yield* dawtool("junk.als");
      const exit = yield* Effect.exit(convertLiveSetFile({ bytes, title: "junk", path: PATH }));
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});
