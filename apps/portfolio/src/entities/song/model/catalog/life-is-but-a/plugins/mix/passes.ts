import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";

import { bassBus } from "./bass-bus.ts";
import { drumBus } from "./drum-bus.ts";
import { keysBus } from "./keys-bus.ts";
import type { Session } from "./life.ts";
import { voiceBus } from "./voice-bus.ts";

export interface Pass {
  readonly session: Session;
  readonly main: Bus;
}

export const rhythmPass = ({ session: { life, play }, main }: Pass): Float32Array => {
  play("drums");
  const duck = drumBus(life)(main);
  play("bass");
  bassBus(life)({ main, duck });
  return duck;
};

export const melodyPass =
  ({ session: { life, play }, main }: Pass) =>
  (duck: Float32Array): void => {
    play("organ");
    keysBus(life)({ main, duck });
    play("voices");
    voiceBus(life)({ main, duck });
  };
