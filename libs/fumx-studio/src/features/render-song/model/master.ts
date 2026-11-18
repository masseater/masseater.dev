import type { Song } from "@r_masseater/fumx-parser";
import { Effect } from "effect";

import { breathe } from "#/shared/lib/studio/breathe.ts";
import { curveApplied } from "#/shared/lib/studio/curves.ts";

import { mixedDown } from "./mixdown.ts";
import type { Stem } from "./mixdown.ts";
import { EVERY, stageOf } from "./stages.ts";
import type { Curve } from "./stages.ts";
import type { Unplayable } from "./unplayable.ts";

export interface Mixing {
  readonly song: Song;
  readonly frames: number;
  readonly stems: readonly Stem[];
}

export interface Mastered {
  readonly frames: number;
  readonly stems: readonly Stem[];
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
  readonly every: number;
  readonly stages: readonly Readonly<Curve>[];
}

export const mastered = ({ song, frames, stems }: Mixing): Effect.Effect<Mastered, Unplayable> =>
  Effect.gen(function* master() {
    yield* breathe;
    const mix = mixedDown(frames)(stems);
    const stages = yield* Effect.forEach(
      song.master,
      (effect) =>
        Effect.map(stageOf(frames)(mix)(effect), (curve) => {
          curveApplied(frames)({ curve, every: EVERY })(mix);
          return curve;
        }),
      { concurrency: 1 },
    );
    return { frames, stems, left: mix.left, right: mix.right, every: EVERY, stages };
  });
