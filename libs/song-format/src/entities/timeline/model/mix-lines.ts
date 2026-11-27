import { Array as Arr, Option, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import type { Envelope, Level, MixParameter, MixPoint, TrackMix } from "./events.ts";
import { endOfSpan } from "./layout.ts";
import type { Span } from "./layout.ts";
import type { PlannedBus, PlannedPart } from "./plan.ts";

const DECIMALS = 1;
const PERCENT = 100;
const NONE = 0;
const NEXT = 1;

const amountText = (value: number, unit: string): string => {
  const text = Number(value.toFixed(DECIMALS));
  if (text > NONE) {
    return `+${String(text)}${unit}`;
  }
  return `${String(text)}${unit}`;
};

const UNITS: Readonly<Record<MixParameter, From<number, string>>> = {
  volume: (decibels) => amountText(decibels, "dB"),
  pan: (pan) => amountText(pan * PERCENT, "%"),
};

const levelWords: From<Level, readonly string[]> = (level) => [
  ...pipe(
    Option.some(level.decibels),
    Option.filter((decibels) => UNITS.volume(decibels) !== UNITS.volume(NONE)),
    Option.map((decibels) => `volume ${UNITS.volume(decibels)}`),
    Option.toArray,
  ),
  ...pipe(
    Option.some(level.pan),
    Option.filter((pan) => UNITS.pan(pan) !== UNITS.pan(NONE)),
    Option.map((pan) => `pan ${UNITS.pan(pan)}`),
    Option.toArray,
  ),
  ...pipe(
    Option.some("mute"),
    Option.filter(() => level.muted),
    Option.toArray,
  ),
];

export type Mixing = Readonly<{ mix: TrackMix; buses: readonly PlannedBus[] }>;

export const trackMixWords: From<Mixing, readonly string[]> = ({ mix, buses }) => [
  ...levelWords(mix.level),
  ...pipe(
    mix.sends,
    Arr.filter((send) => send.amount > NONE),
    Arr.flatMap((send) =>
      pipe(
        Arr.get(buses, send.bus),
        Option.map((bus) => `send ${bus.name} ${amountText(send.amount * PERCENT, "%")}`),
        Option.toArray,
      ),
    ),
  ),
];

export const busLineOf: From<PlannedBus, string> = (bus) =>
  Arr.join(["bus", bus.name, ...levelWords(bus.level)], " ");

const valueAt =
  (points: readonly MixPoint[]): From<number, number> =>
  (tick) => {
    const before = pipe(
      points,
      Arr.filter((point) => point.tick <= tick),
      Arr.last,
    );
    const after = pipe(
      points,
      Arr.findFirst((point) => point.tick > tick),
    );
    return Option.match(before, {
      onNone: () => Option.match(after, { onNone: () => NONE, onSome: (point) => point.value }),
      onSome: (left) =>
        Option.match(after, {
          onNone: () => left.value,
          onSome: (right) =>
            left.value +
            ((right.value - left.value) * (tick - left.tick)) / (right.tick - left.tick),
        }),
    });
  };

const rampOf =
  (bar: Span, name: string): From<Envelope, Option.Option<string>> =>
  (envelope) => {
    const at = valueAt(envelope.points);
    const unit = UNITS[envelope.parameter];
    const from = unit(at(bar.start));
    const to = unit(at(endOfSpan(bar)));
    return pipe(
      Option.some(`automate ${name}.${envelope.parameter} ${from} -> ${to} over 1bar`),
      Option.filter(() => from !== to),
    );
  };

export const automationLinesOf =
  (bar: Span): From<PlannedPart, readonly string[]> =>
  (planned) =>
    pipe(
      planned.mix.envelopes,
      Arr.filter((envelope) => Arr.length(envelope.points) > NEXT),
      Arr.map(rampOf(bar, planned.name)),
      Arr.getSomes,
    );
