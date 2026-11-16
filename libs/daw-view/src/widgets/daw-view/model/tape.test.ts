import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option } from "effect";

import { BLOCK_FRAMES, openTape } from "./tape.ts";
import type { TrackBlock } from "./tape.ts";

const HALF = 0.5;
const FRAMES = BLOCK_FRAMES + BLOCK_FRAMES * HALF;
const TRACKS = 2;
const LATER = 1;
const MONO = 1;
const STEREO = 2;
const SILENT = 0;
const PRECISION = 4;
const PROBE = 100;

const filled = (value: (frame: number) => number): Float32Array<ArrayBuffer> =>
  Float32Array.from({ length: FRAMES }, (_unused, frame) => value(frame));

const wave = (frame: number): number => Math.sin(frame / PROBE) * HALF;
const quiet = (): number => SILENT;

const EMPTY: TrackBlock = { channels: SILENT, scale: SILENT, data: new Int16Array() };

const trackIn =
  (blocks: readonly TrackBlock[]) =>
  (track: number): TrackBlock =>
    Option.getOrElse(Arr.get(blocks, track), () => EMPTY);

const sampleOf =
  (block: TrackBlock) =>
  (at: number): number =>
    Option.getOrElse(Arr.get([...block.data], at), () => SILENT) * block.scale;

describe("a tape", () => {
  it.live("gives back each track block by block, in one channel where both sides agree", () =>
    Effect.gen(function* test() {
      const tape = yield* Effect.promise(() => openTape({ tracks: TRACKS, frames: FRAMES }));
      tape.write(SILENT, filled(wave), filled(wave));
      tape.write(MONO, filled(wave), filled(quiet));
      const blocks = yield* Effect.promise(() => tape.block(LATER));
      const track = trackIn(blocks);
      tape.close();
      expect([tape.blocks, track(SILENT).channels, track(MONO).channels]).toStrictEqual([
        STEREO,
        MONO,
        STEREO,
      ]);
      expect(track(SILENT).data).toHaveLength(BLOCK_FRAMES * HALF);
      expect(sampleOf(track(SILENT))(PROBE)).toBeCloseTo(wave(BLOCK_FRAMES + PROBE), PRECISION);
      expect(sampleOf(track(MONO))(PROBE * STEREO + MONO)).toBe(SILENT);
    }),
  );
});
