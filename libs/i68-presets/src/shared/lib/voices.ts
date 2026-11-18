import type { Role } from "@r_masseater/fumx-parser";
import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";
import { overlapOf } from "@r_masseater/fumx-parser/analysis";
import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import type { Report, RuleContext } from "@r_masseater/i68";
import { Array as Arr, Option, Order, Record as Rec, pipe } from "effect";

const SIXTEENTHS_PER_WHOLE = 16;
const SIXTEENTH = TICKS_PER_WHOLE / SIXTEENTHS_PER_WHOLE;

export const MELODIC: readonly Role[] = ["melody", "countermelody"];

export const hasRole =
  (roles: readonly Role[]) =>
  (sounding: Sounding): boolean =>
    Option.exists(sounding.role, (role) => Arr.contains(roles, role));

export const isPitched = (sounding: Sounding): boolean =>
  !Option.exists(sounding.role, (role) => role === "drums");

const byStart = Order.mapInput(Order.Number, (sounding: Sounding) => sounding.start);

const byPitch = Order.mapInput(Order.Number, (sounding: Sounding) => sounding.midi);

export const sortByStart = (soundings: readonly Sounding[]): readonly Sounding[] =>
  Arr.sort(soundings, byStart);

export const sortByPitch = (soundings: readonly Sounding[]): readonly Sounding[] =>
  Arr.sort(soundings, byPitch);

export const highest = (soundings: Arr.NonEmptyReadonlyArray<Sounding>): Sounding =>
  Arr.max(soundings, byPitch);

export const lowest = (soundings: Arr.NonEmptyReadonlyArray<Sounding>): Sounding =>
  Arr.min(soundings, byPitch);

export type Pair = readonly [Sounding, Sounding];

const stillSounding =
  (sounding: Sounding) =>
  (active: Sounding): boolean =>
    active.end > sounding.start;

const heldTogether =
  (sounding: Sounding) =>
  (other: Sounding): boolean =>
    overlapOf(other)(sounding) >= SIXTEENTH;

export const overlappingPairs = (soundings: readonly Sounding[]): readonly Pair[] => {
  const pairs: Pair[] = [];
  let active: readonly Sounding[] = [];
  for (const sounding of sortByStart(soundings)) {
    active = pipe(active, Arr.filter(stillSounding(sounding)));
    for (const other of pipe(active, Arr.filter(heldTogether(sounding)))) {
      pairs.push([other, sounding]);
    }
    active = [...active, sounding];
  }
  return pairs;
};

export type Reporter = (key: string, report: Report) => void;

export const reporterOf = (context: RuleContext): Reporter => {
  const seen = new Set<string>();
  return (key, report) => {
    if (!seen.has(key)) {
      seen.add(key);
      context.report(report);
    }
  };
};

export const tracksOf = (soundings: readonly Sounding[]): readonly (readonly Sounding[])[] =>
  pipe(
    Arr.groupBy(soundings, (sounding) => sounding.track),
    Rec.values,
    Arr.map(sortByStart),
  );

export const soundingAt =
  (soundings: readonly Sounding[]) =>
  (tick: number): readonly Sounding[] =>
    pipe(
      soundings,
      Arr.filter((sounding) => sounding.start <= tick && tick < sounding.end),
    );

export type Onset = Arr.NonEmptyReadonlyArray<Sounding>;

const byOnset = Order.mapInput(byStart, (group: Onset) => Arr.headNonEmpty(group));

export const onsetsOf = (soundings: readonly Sounding[]): readonly Onset[] =>
  pipe(
    Arr.groupBy(soundings, (sounding) => String(sounding.start)),
    Rec.values,
    (groups) => Arr.sort(groups, byOnset),
  );

export const topLineOf = (soundings: readonly Sounding[]): readonly Sounding[] =>
  pipe(onsetsOf(soundings), Arr.map(highest));

export const NEXT = 1;

export const neighborsOf = <Value>(
  values: readonly Value[],
): readonly (readonly [Value, Value])[] => Arr.zip(values, Arr.drop(values, NEXT));
