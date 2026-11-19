import { svf } from "@masseater.dev/fumx-studio/dsp/filter";
import type { SvfKind } from "@masseater.dev/fumx-studio/dsp/filter";
import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";
import { activeIn } from "@masseater.dev/fumx-studio/studio/activity";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import { timeOf } from "@masseater.dev/fumx-studio/studio/moment";
import { Option } from "effect";

import type { Kuraku } from "./kuraku.ts";
import type { TimeSpan } from "./score-schema.ts";

const PAD = 0.25;
const SILENT = 0;

export interface SweepShape {
  readonly kind: SvfKind;
  readonly resonance: number;
  readonly curve: (seconds: number) => number;
}

const framesAt = (seconds: number): number => Math.round(seconds * SAMPLE_RATE);

const endOf = (kuraku: Kuraku, span: TimeSpan): number =>
  Option.match(Option.fromUndefinedOr(span.to), {
    onNone: () => kuraku.frames,
    onSome: (to) =>
      Math.min(kuraku.frames, framesAt(timeOf(kuraku.grid)(to) + (span.after ?? SILENT))),
  });

const swept = (kuraku: Kuraku, bus: Bus, [sweep, span]: readonly [SweepShape, TimeSpan]): void => {
  const start = framesAt(timeOf(kuraku.grid)(span.from));
  const end = endOf(kuraku, span);
  const cutoff = (index: number): number => sweep.curve(index / SAMPLE_RATE);
  for (const [from, to] of activeIn({ frames: kuraku.frames, pad: PAD })(bus)) {
    const first = Math.max(from, start);
    const last = Math.min(to, end);
    if (last > first) {
      for (const channel of [bus.left, bus.right]) {
        svf({ kind: sweep.kind, cutoff, resonance: sweep.resonance, from: first, to: last })(
          channel,
        );
      }
    }
  }
};

export const sweptAll =
  ({ bus, sweep, spans }: Readonly<{ bus: Bus; sweep: SweepShape; spans: readonly TimeSpan[] }>) =>
  (kuraku: Kuraku): void => {
    for (const span of spans) {
      swept(kuraku, bus, [sweep, span]);
    }
  };
