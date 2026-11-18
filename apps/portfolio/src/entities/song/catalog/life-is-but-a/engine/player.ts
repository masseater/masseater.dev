import type { MixPlayer, PlayerSetup } from "@masseater.dev/daw-view/worklet";
import { playerFor } from "@masseater.dev/fumx-studio/live/mixer";
import type { Mastering } from "@masseater.dev/fumx-studio/live/mixer";
import { clipped, curveAt } from "@masseater.dev/fumx-studio/studio/curves";
import { Schema } from "effect";

import { MASTER } from "./mastering.ts";

const SILENT = 0;
const ONE = 1;

export const LiveInitSchema = Schema.Struct({
  frames: Schema.Finite,
  tracks: Schema.Finite,
  compression: Schema.instanceOf(Float32Array),
  limit: Schema.instanceOf(Float32Array),
});

export type LiveInit = typeof LiveInitSchema.Type;

const initOf = Schema.decodeUnknownOption(LiveInitSchema);

const EMPTY: LiveInit = {
  frames: SILENT,
  tracks: SILENT,
  compression: new Float32Array(),
  limit: new Float32Array(),
};

const masteredInto = (init: LiveInit): Mastering => {
  const compression = curveAt({ curve: init.compression, every: MASTER.compression.every });
  const limit = curveAt({ curve: init.limit, every: MASTER.limit.every });
  const clip = clipped(MASTER.clip);
  return (channel, [position, end]) => {
    for (let frame = SILENT; frame < end; frame += ONE) {
      const at = position + frame;
      channel[frame] = clip((channel[frame] ?? SILENT) * compression(at)) * limit(at);
    }
  };
};

export const playerOf: (setup: PlayerSetup) => MixPlayer = playerFor({
  decoded: initOf,
  empty: EMPTY,
  mastering: masteredInto,
});
