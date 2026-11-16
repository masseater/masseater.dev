import { activeIn, eachActive } from "./activity.ts";
import { busOf } from "./bus.ts";
import { chorus } from "./chorus.ts";
import { delayed } from "./delay.ts";
import { compress, widen } from "./dynamics.ts";
import { crossfadeEdge } from "./edits.ts";
import { fieldOf } from "./field.ts";
import { duckEnvelope, envelopeOver, gainOver, mixInto } from "./mixing.ts";

export interface Processing {
  readonly bus: ReturnType<typeof busOf>;
  readonly mix: ReturnType<typeof mixInto>;
  readonly gain: ReturnType<typeof gainOver>;
  readonly envelope: ReturnType<typeof envelopeOver>;
  readonly duck: ReturnType<typeof duckEnvelope>;
  readonly delay: ReturnType<typeof delayed>;
  readonly chorus: ReturnType<typeof chorus>;
  readonly widen: ReturnType<typeof widen>;
  readonly compress: ReturnType<typeof compress>;
  readonly active: (pad?: number) => ReturnType<typeof activeIn>;
  readonly each: typeof eachActive;
  readonly crossfadeEdge: ReturnType<typeof crossfadeEdge>;
}

export const processingOf = (frames: number): Processing => ({
  bus: busOf(frames),
  mix: mixInto(frames),
  gain: gainOver(frames),
  envelope: envelopeOver(frames),
  duck: duckEnvelope(frames),
  delay: delayed(frames),
  chorus: chorus(frames),
  widen: widen(frames),
  compress: compress(frames),
  active: (pad) => activeIn({ frames, ...fieldOf("pad")(pad) }),
  each: eachActive,
  crossfadeEdge: crossfadeEdge(frames),
});
