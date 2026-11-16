import { Option } from "effect";

import { svf } from "#/entities/song/lib/dsp/filter.ts";
import type { SvfKind } from "#/entities/song/lib/dsp/filter.ts";
import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import { activeIn } from "#/entities/song/lib/studio/activity.ts";
import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import { timeOf } from "#/entities/song/lib/studio/moment.ts";

import type { Kuraku } from "./kuraku.ts";
import type { Span } from "./score-schema.ts";

const PAD = 0.25;
const SILENT = 0;

export interface Sweep {
  readonly kind: SvfKind;
  readonly resonance: number;
  readonly curve: (seconds: number) => number;
}

const framesAt = (seconds: number): number => Math.round(seconds * SAMPLE_RATE);

const endOf = (kuraku: Kuraku, span: Span): number =>
  Option.match(Option.fromUndefinedOr(span.to), {
    onNone: () => kuraku.frames,
    onSome: (to) =>
      Math.min(kuraku.frames, framesAt(timeOf(kuraku.grid)(to) + (span.after ?? SILENT))),
  });

const swept = (kuraku: Kuraku, bus: Bus, [sweep, span]: readonly [Sweep, Span]): void => {
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
  ({ bus, sweep, spans }: Readonly<{ bus: Bus; sweep: Sweep; spans: readonly Span[] }>) =>
  (kuraku: Kuraku): void => {
    for (const span of spans) {
      swept(kuraku, bus, [sweep, span]);
    }
  };
