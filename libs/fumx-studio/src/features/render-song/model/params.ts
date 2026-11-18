import type { PlayParam } from "@r_masseater/fumx-parser";
import { Array as Arr, Match, Option, pipe } from "effect";

import { decibels } from "#/shared/lib/dsp/number.ts";
import type { Placement } from "#/shared/lib/studio/placement.ts";

const MILLI = 1e-3;
const NONE = 0;
const ONE = 1;

export interface Send {
  readonly bus: string;
  readonly amount: number;
}

const resonanceOf = (resonance: Option.Option<number>): Placement =>
  Option.match(resonance, { onNone: () => ({}), onSome: (given) => ({ resonance: given }) });

const lowPassOf = (
  param: Extract<PlayParam, { kind: "lowpass" }>,
): NonNullable<Placement["lowPass"]> =>
  Option.match(param.targetHertz, {
    onNone: () => param.hertz,
    onSome: (to) => ({ from: param.hertz, to }),
  });

const paramPlacement = (param: PlayParam): Placement =>
  Match.value(param).pipe(
    Match.discriminatorsExhaustive("kind")({
      semi: ({ semitones }) => ({ semitones }),
      length: ({ milliseconds }) => ({ duration: milliseconds * MILLI }),
      attack: ({ milliseconds }) => ({ attack: milliseconds * MILLI }),
      release: ({ milliseconds }) => ({ release: milliseconds * MILLI }),
      decay: ({ milliseconds }) => ({ decay: milliseconds * MILLI }),
      offset: ({ milliseconds }) => ({ offset: milliseconds * MILLI }),
      highpass: ({ hertz }) => ({ highPass: hertz }),
      lowpass: (given) => ({ lowPass: lowPassOf(given), ...resonanceOf(given.resonance) }),
      gain: (given) => ({ gain: decibels(given.decibels) }),
      pan: ({ amount }) => ({ pan: amount }),
      drive: ({ amount }) => ({ drive: amount }),
      send: () => ({}),
      reverse: () => ({ reverse: {} }),
    }),
  );

const merged = (placement: Placement, added: Placement): Placement => ({
  ...placement,
  ...added,
  gain: (placement.gain ?? ONE) * (added.gain ?? ONE),
  semitones: (placement.semitones ?? NONE) + (added.semitones ?? NONE),
});

export const placementOf =
  (params: readonly PlayParam[]) =>
  (base: Placement): Placement => {
    let placement = base;
    for (const param of params) {
      placement = merged(placement, paramPlacement(param));
    }
    return placement;
  };

export const sendsOf = (params: readonly PlayParam[]): readonly Send[] =>
  pipe(
    params,
    Arr.flatMap((param): readonly Send[] => {
      if (param.kind === "send") {
        return [{ bus: param.bus, amount: param.amount }];
      }
      return [];
    }),
  );
