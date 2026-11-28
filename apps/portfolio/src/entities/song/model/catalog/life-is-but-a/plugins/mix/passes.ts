import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";

import { bassBus } from "./bass-bus.ts";
import type { Life } from "./context.ts";
import { drumBus } from "./drum-bus.ts";
import { keysBus } from "./keys-bus.ts";
import type { Session } from "./life.ts";
import { voiceBus } from "./voice-bus.ts";

export interface Pass {
  readonly session: Session;
  readonly main: Bus;
}

interface Duck {
  readonly main: Bus;
  readonly duck: Float32Array;
}

type Follower = readonly [stage: string, bus: (life: Life) => (input: Duck) => void];

const followed =
  ({ session: { life, play }, main }: Pass) =>
  (duck: Float32Array) =>
  (followers: readonly Follower[]): void => {
    for (const [stage, bus] of followers) {
      play(stage);
      bus(life)({ main, duck });
    }
  };

export const rhythmPass = (pass: Pass): Float32Array => {
  const { session, main } = pass;
  session.play("drums");
  const duck = drumBus(session.life)(main);
  followed(pass)(duck)([["bass", bassBus]]);
  return duck;
};

export const melodyPass =
  (pass: Pass) =>
  (duck: Float32Array): void => {
    followed(pass)(duck)([
      ["organ", keysBus],
      ["voices", voiceBus],
    ]);
  };
