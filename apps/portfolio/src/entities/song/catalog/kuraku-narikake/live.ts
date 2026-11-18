import type { LiveMix, Rendered, Take, Tape } from "@masseater.dev/daw-view";
import { withLive } from "@masseater.dev/fumx-studio/daw/mixdown";
import { Option, pipe } from "effect";

import { workletIn } from "#/entities/song/model/daw.ts";

import type { Mastered } from "./engine/master.ts";
import type { LiveInit } from "./engine/player.ts";
import { MIX } from "./engine/score.ts";

const worklet = workletIn(
  import.meta.glob<string>("./worklet.ts", {
    query: "?worker&url",
    import: "default",
    eager: true,
  }),
);

export interface Finish {
  readonly out: Mastered;
  readonly drums: readonly boolean[];
  readonly take: Take;
}

const liveOf =
  ({ out, drums }: Finish) =>
  (tape: Tape): LiveMix => {
    const init: LiveInit = { frames: out.left.length, drums, curves: out.curves };
    const { drum, low, mid, high, limit } = out.curves;
    return {
      tracks: MIX.order,
      worklet,
      init,
      transfer: [drum.buffer, low.buffer, mid.buffer, high.buffer, limit.buffer],
      tape,
    };
  };

export const finished =
  (finish: Finish) =>
  (tape: Option.Option<Tape>): Rendered => {
    const live = pipe(tape, Option.map(liveOf(finish)));
    return withLive({ left: finish.out.left, right: finish.out.right, take: finish.take })(live);
  };
