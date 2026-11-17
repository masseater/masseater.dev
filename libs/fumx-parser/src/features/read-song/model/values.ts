import { Array as Arr, Match, Option, Predicate, pipe } from "effect";
import { Note } from "tonal";

import { fractionOf, ticksOf } from "#/shared/lib/ticks.ts";
import {
  decibelsOf,
  hertzOf,
  millisecondsOf,
  percentOf,
  pitchOf,
  semitonesOf,
} from "#/shared/lib/units.ts";
import type { Literal } from "#generated/langium/ast.ts";

import type { From } from "./problem.ts";

const NONE = 0;

export type Measure = "decibels" | "percent" | "hertz" | "time" | "semitones";

export type Value =
  | { readonly kind: "number"; readonly value: number }
  | { readonly [Kind in Measure]: { readonly kind: Kind; readonly value: number } }[Measure]
  | { readonly kind: "pitch"; readonly midi: number; readonly cents: number }
  | { readonly kind: "duration"; readonly ticks: number }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "bool"; readonly value: boolean }
  | { readonly kind: "list"; readonly items: readonly Value[] }
  | { readonly kind: "none" };

export const NOTHING: Value = { kind: "none" };

export const numberValue: From<number, Value> = (value) => ({ kind: "number", value });

export const boolValue: From<boolean, Value> = (value) => ({ kind: "bool", value });

const measured: From<Measure, From<number, Value>> = (kind) => (value) => ({ kind, value });

const pitchValue: From<string, Option.Option<Value>> = (text) =>
  pipe(
    pitchOf(text),
    Option.map(({ midi, cents }) => ({ kind: "pitch", midi, cents })),
  );

const durationValue: From<string, Option.Option<Value>> = (text) =>
  pipe(
    ticksOf(text),
    Option.map((ticks) => ({ kind: "duration", ticks })),
  );

type Reader = readonly [From<Literal, Option.Option<string>>, From<string, Option.Option<Value>>];

const READERS: readonly Reader[] = [
  [(literal) => Option.fromNullishOr(literal.pitch), pitchValue],
  [(literal) => Option.fromNullishOr(literal.duration), durationValue],
  [
    (literal) => Option.fromNullishOr(literal.decibels),
    (text) => Option.some(measured("decibels")(decibelsOf(text))),
  ],
  [
    (literal) => Option.fromNullishOr(literal.percent),
    (text) => Option.some(measured("percent")(percentOf(text))),
  ],
  [
    (literal) => Option.fromNullishOr(literal.hertz),
    (text) => Option.some(measured("hertz")(hertzOf(text))),
  ],
  [
    (literal) => Option.fromNullishOr(literal.time),
    (text) => Option.some(measured("time")(millisecondsOf(text))),
  ],
  [
    (literal) => Option.fromNullishOr(literal.semitones),
    (text) => Option.some(measured("semitones")(semitonesOf(text))),
  ],
  [
    (literal) => Option.fromNullishOr(literal.text),
    (text) => Option.some({ kind: "string", value: text }),
  ],
];

const readWith: From<Literal, From<Reader, Option.Option<Value>>> =
  (literal) =>
  ([field, read]) =>
    Option.flatMap(field(literal), (text) => read(text));

export const literalValue: From<Literal, Option.Option<Value>> = (literal) => {
  if (Predicate.isNumber(literal.number)) {
    return Option.some(numberValue(literal.number));
  }
  if (Predicate.isString(literal.truth)) {
    return Option.some(boolValue(literal.truth === "true"));
  }
  return pipe(
    READERS,
    Arr.findFirst((reader) => readWith(literal)(reader)),
  );
};

export const pitchText: From<Extract<Value, { readonly kind: "pitch" }>, string> = (pitch) => {
  const name = Note.fromMidi(pitch.midi);
  if (pitch.cents === NONE) {
    return name;
  }
  if (pitch.cents > NONE) {
    return `${name}+${String(pitch.cents)}c`;
  }
  return `${name}${String(pitch.cents)}c`;
};

export const describe: From<Value, string> = (value) =>
  Match.value(value).pipe(
    Match.discriminatorsExhaustive("kind")({
      pitch: (pitch) => pitchText(pitch),
      duration: (duration) => fractionOf(duration.ticks),
      list: (list) =>
        `[${pipe(
          list.items,
          Arr.map((item) => describe(item)),
          Arr.join(", "),
        )}]`,
      none: () => "なし",
      number: (number) => String(number.value),
      decibels: (amount) => `${String(amount.value)}dB`,
      percent: (amount) => `${String(amount.value)}%`,
      hertz: (amount) => `${String(amount.value)}Hz`,
      time: (amount) => `${String(amount.value)}ms`,
      semitones: (amount) => `${String(amount.value)}st`,
      string: (text) => `"${text.value}"`,
      bool: (truth) => String(truth.value),
    }),
  );

export const sameValue: From<Value, From<Value, boolean>> = (left) => (right) =>
  describe(left) === describe(right);
