import type { LiveMix, Tape } from "@masseater.dev/daw-view";
import { Array as Arr, pipe } from "effect";

import { workletIn } from "#/entities/song/model/daw.ts";

import { trackNameOf } from "./lanes.ts";
import type { MasterOut } from "./master.ts";
import type { LiveInit } from "./player.ts";
import { MIX } from "./score.ts";

const worklet = workletIn(
  import.meta.glob<string>("./worklet.ts", {
    query: "?worker&url",
    import: "default",
    eager: true,
  }),
);

export interface Finish {
  readonly out: MasterOut;
  readonly drums: readonly boolean[];
}

export const liveOf =
  ({ out, drums }: Finish) =>
  (tape: Tape): LiveMix => {
    const init: LiveInit = { frames: out.left.length, drums, curves: out.curves };
    const { drum, low, mid, high, limit } = out.curves;
    return {
      tracks: pipe(MIX.order, Arr.map(trackNameOf)),
      worklet,
      init,
      transfer: [drum.buffer, low.buffer, mid.buffer, high.buffer, limit.buffer],
      tape,
    };
  };
