import { Array as Arr, Match, pipe } from "effect";

import { biquad } from "#/entities/song/lib/dsp/biquad.ts";
import { SVF, svf } from "#/entities/song/lib/dsp/filter.ts";
import type { Cutoff } from "#/entities/song/lib/dsp/filter.ts";
import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import { drive } from "#/entities/song/lib/dsp/shape.ts";
import type { ChannelEdit } from "#/entities/song/lib/studio/activity.ts";

import type { Curves } from "./kuraku.ts";
import type { Filter } from "./score-schema.ts";

const cutoffOf = (
  curves: Curves,
  filter: Readonly<{ cutoff: number }> | Readonly<{ curve: "breakHighPass" }>,
): Cutoff => {
  if ("cutoff" in filter) {
    return filter.cutoff;
  }
  const shape = curves[filter.curve];
  return (index) => shape(index / SAMPLE_RATE);
};

const editOf =
  (curves: Curves) =>
  (filter: Filter): ChannelEdit =>
    Match.value(filter).pipe(
      Match.when(
        { svf: Match.string },
        (step) => (channel: Float32Array, from: number, to: number) => {
          svf({
            kind: SVF[step.svf],
            cutoff: cutoffOf(curves, step),
            resonance: step.resonance,
            from,
            to,
          })(channel);
        },
      ),
      Match.when(
        { biquad: Match.string },
        (step) => (channel: Float32Array, from: number, to: number) => {
          biquad({
            kind: step.biquad,
            hertz: step.hertz,
            gain: step.gain,
            resonance: step.resonance,
            from,
            to,
          })(channel);
        },
      ),
      Match.orElse((step) => (channel: Float32Array, from: number, to: number) => {
        drive({ pre: step.drive, post: step.post, from, to })(channel);
      }),
    );

export const chainOf =
  (curves: Curves) =>
  (chain: readonly Filter[]): ChannelEdit => {
    const edits = pipe(chain, Arr.map(editOf(curves)));
    return (channel, from, to) => {
      for (const edit of edits) {
        edit(channel, from, to);
      }
    };
  };
