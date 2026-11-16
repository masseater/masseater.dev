import type { Effect } from "effect";

import type { Stage } from "#/entities/song/lib/studio/breathe.ts";
import type { Bus } from "#/entities/song/lib/studio/bus.ts";

import type { Life } from "./context.ts";
import { playStage } from "./score.ts";

export const STAGES = {
  drums: { share: 0.02, label: "drums" },
  drumBus: { share: 0.07, label: "drum bus" },
  bass: { share: 0.12, label: "bass" },
  bassFilter: { share: 0.16, label: "bass filter" },
  organ: { share: 0.22, label: "organ" },
  keysBus: { share: 0.3, label: "keys bus" },
  voices: { share: 0.4, label: "voices" },
  voicesBus: { share: 0.5, label: "voices bus" },
  delay: { share: 0.58, label: "delay" },
  plate: { share: 0.66, label: "plate reverb" },
  plateRight: { share: 0.76, label: "plate reverb" },
  mixdown: { share: 0.84, label: "mixdown" },
  cuts: { share: 0.88, label: "cut-ups" },
  master: { share: 0.92, label: "master" },
  done: { share: 1, label: "done" },
} as const;

export interface Pass {
  readonly life: Life;
  readonly main: Bus;
  readonly reach: (stage: Stage) => Effect.Effect<void>;
}

export interface Ducked extends Pass {
  readonly duck: Float32Array;
}

export const opened =
  (life: Life) =>
  (names: readonly (readonly [string, boolean])[]): void => {
    for (const [name, mono] of names) {
      life.rack.open(name, mono);
    }
  };

export const played =
  (life: Life) =>
  (names: readonly (readonly [string, boolean])[], stage: string): void => {
    opened(life)(names);
    playStage(life)(stage);
  };
