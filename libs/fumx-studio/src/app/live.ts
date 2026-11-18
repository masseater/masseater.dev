import type { LiveMix, Tape } from "@masseater.dev/daw-view";
import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";
import type { Scope } from "effect";

import type { LiveInit } from "#/features/play-song/index.ts";
import type { Mastered } from "#/features/render-song/index.ts";
import { tapeFor } from "#/shared/lib/daw/tape.ts";

const liveOf =
  (worklet: string) =>
  (mastered: Mastered) =>
  (tape: Tape): LiveMix => {
    const init: LiveInit = {
      frames: mastered.frames,
      tracks: mastered.stems.length,
      every: mastered.every,
      stages: mastered.stages,
    };
    return {
      tracks: pipe(
        mastered.stems,
        Arr.map((stem) => stem.name),
      ),
      worklet,
      init,
      transfer: pipe(
        mastered.stages,
        Arr.map((stage) => stage.buffer),
      ),
      tape,
      mixers: Rec.fromEntries(
        pipe(
          mastered.stems,
          Arr.map((stem) => [stem.name, stem.mixer] as const),
        ),
      ),
    };
  };

const recorded =
  (mastered: Mastered) =>
  (tape: Tape): Tape => {
    for (const [index, stem] of mastered.stems.entries()) {
      tape.write(index, stem.bus.left, stem.bus.right);
    }
    return tape;
  };

export const liveFor =
  (worklet: string) =>
  (mastered: Mastered): Effect.Effect<Option.Option<LiveMix>, never, Scope.Scope> =>
    Effect.map(tapeFor({ tracks: mastered.stems.length, frames: mastered.frames }), (tape) =>
      pipe(tape, Option.map(recorded(mastered)), Option.map(liveOf(worklet)(mastered))),
    );
