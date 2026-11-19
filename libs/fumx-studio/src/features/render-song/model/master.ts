import type { LiveMix } from "@masseater.dev/daw-view";
import type { Song } from "@r_masseater/fumx-parser";
import { Effect, Option } from "effect";

import type { Lane } from "#/shared/lib/daw/view.ts";
import type { Stage } from "#/shared/lib/plugin/plugin.ts";
import { breathe } from "#/shared/lib/studio/breathe.ts";
import { curveApplied } from "#/shared/lib/studio/curves.ts";

import { mixedDown } from "./mixdown.ts";
import type { Stem } from "./mixdown.ts";
import { EVERY, stageOf } from "./stages.ts";
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
  readonly stages: readonly Stage[];
  readonly lanes: Readonly<Record<string, Lane>>;
  readonly live: Option.Option<LiveMix>;
}

export const mastered = ({ song, frames, stems }: Mixing): Effect.Effect<Mastered, Unplayable> =>
  Effect.gen(function* master() {
    yield* breathe;
    const mix = mixedDown(frames)(stems);
    const stages = yield* Effect.forEach(
      song.master,
      (effect) =>
        Effect.map(stageOf(frames)(mix)(effect), (curve): Stage => {
          curveApplied(frames)({ curve, every: EVERY })(mix);
          return { kind: "gain", curve, every: EVERY };
        }),
      { concurrency: 1 },
    );
    return {
      frames,
      stems,
      left: mix.left,
      right: mix.right,
      stages,
      lanes: {},
      live: Option.none(),
    };
  });
