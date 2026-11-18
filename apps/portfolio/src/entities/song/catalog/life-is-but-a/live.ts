import type { LiveMix, Rendered as Mixed, Take, Tape } from "@masseater.dev/daw-view";
import { withLive } from "@masseater.dev/fumx-studio/daw/mixdown";
import { Option, pipe } from "effect";

import { workletIn } from "#/entities/song/model/daw.ts";

import type { Sink } from "./engine/context.ts";
import type { LiveInit } from "./engine/player.ts";
import type { Rendered } from "./engine/rendered.ts";

export const MIXED: readonly string[] = [
  "KICK",
  "DRUMS",
  "BASS SUB",
  "BASS MID",
  "ORGAN",
  "FM PIANO",
  "PAD",
  "VOICES",
  "FRONT VOICE",
  "FX",
  "PLATE SEND",
  "DELAY SEND",
];

const worklet = workletIn(
  import.meta.glob<string>("./worklet.ts", {
    query: "?worker&url",
    import: "default",
    eager: true,
  }),
);

const liveOf =
  (out: Rendered) =>
  (tape: Tape): LiveMix => {
    const init: LiveInit = {
      frames: out.left.length,
      tracks: MIXED.length,
      compression: out.compression,
      limit: out.limit,
    };
    return {
      tracks: MIXED,
      worklet,
      init,
      transfer: [out.compression.buffer, out.limit.buffer],
      tape,
    };
  };

export const sinkOn = (tape: Tape): Sink => ({
  write: (name, left, right) => {
    tape.write(MIXED.indexOf(name), left, right);
  },
});

export interface Finish {
  readonly out: Rendered;
  readonly take: Take;
}

export const finished =
  ({ out, take }: Finish) =>
  (tape: Option.Option<Tape>): Mixed => {
    const live = pipe(tape, Option.map(liveOf(out)));
    return withLive({ left: out.left, right: out.right, take })(live);
  };
