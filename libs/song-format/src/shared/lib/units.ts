import { Option, String as Str, pipe } from "effect";
import { Note } from "tonal";

import { groupsOf } from "./groups.ts";

const KILO = 1000;
const HUNDRED = 100;
const START = 0;
const PITCH = /^(?<name>[A-G](?:##|#|bb|b)?-?\d)(?<cents>[+-]\d+)?c?$/u;
const RATIO = /^(?<left>[\d.]+):(?<right>[\d.]+)$/u;

const amountBefore =
  (suffix: string) =>
  (text: string): number =>
    Number(Str.slice(START, Str.length(text) - Str.length(suffix))(text));

export const millisecondsOf = amountBefore("ms");
export const decibelsOf = amountBefore("dB");
export const semitonesOf = amountBefore("st");
export const bpmOf = amountBefore("bpm");
export const barsOf = amountBefore("bar");
export const countOf = (text: string): number => Number(Str.slice(Str.length("x"))(text));
export const shareOf = (text: string): number => amountBefore("%")(text) / HUNDRED;

export const hertzOf = (text: string): number => {
  if (Str.endsWith("kHz")(text)) {
    return amountBefore("kHz")(text) * KILO;
  }
  return amountBefore("Hz")(text);
};

export interface Ratio {
  readonly left: number;
  readonly right: number;
}

export const ratioOf = (text: string): Option.Option<Ratio> =>
  pipe(
    groupsOf(RATIO)(text),
    Option.flatMap(({ left, right }) =>
      Option.all({ left: Option.fromNullishOr(left), right: Option.fromNullishOr(right) }),
    ),
    Option.map(({ left, right }) => ({ left: Number(left), right: Number(right) })),
  );

export interface Pitch {
  readonly midi: number;
  readonly cents: number;
}

export const pitchOf = (text: string): Option.Option<Pitch> =>
  pipe(
    groupsOf(PITCH)(text),
    Option.flatMap(({ name, cents }) =>
      pipe(
        Option.fromNullishOr(name),
        Option.flatMap((noteName) => Option.fromNullishOr(Note.midi(noteName))),
        Option.map((midi) => ({ midi, cents: Number(cents ?? "0") })),
      ),
    ),
  );
