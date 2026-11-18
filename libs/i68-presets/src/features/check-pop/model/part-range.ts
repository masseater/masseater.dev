import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule, RuleOptions } from "@r_masseater/i68";
import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";

import { midiOf, nameOf } from "#/shared/lib/pitch.ts";
import { reporterOf } from "#/shared/lib/voices.ts";
import type { Reporter } from "#/shared/lib/voices.ts";

export type Range = readonly [string, string];

export type Ranges = Readonly<Record<string, Range>>;

export const DEFAULT_RANGES: Ranges = {
  melody: ["C3", "C6"],
  countermelody: ["C3", "C6"],
  bass: ["E1", "C4"],
};

interface Bounds {
  readonly low: number;
  readonly high: number;
}

const RANGE_LENGTH = 2;

const isRange = (value: unknown): value is Range =>
  Arr.isArray(value) && value.length === RANGE_LENGTH && pipe(value, Arr.every(Predicate.isString));

const boundsOf = ([low, high]: Range): Option.Option<Bounds> =>
  Option.all({ low: midiOf(low), high: midiOf(high) });

const configured = (options: RuleOptions): Readonly<Record<string, unknown>> =>
  pipe(
    Option.fromNullishOr(options["ranges"]),
    Option.filter(Predicate.isObject),
    Option.map((value): Readonly<Record<string, unknown>> => ({ ...value })),
    Option.getOrElse((): Readonly<Record<string, unknown>> => DEFAULT_RANGES),
  );

const rangesOf = (options: RuleOptions): Readonly<Record<string, Bounds>> =>
  pipe(
    configured(options),
    Rec.toEntries,
    Arr.flatMap(([name, value]) =>
      pipe(
        Option.liftPredicate(value, isRange),
        Option.flatMap(boundsOf),
        Option.map((bounds): readonly [string, Bounds] => [name, bounds]),
        Option.toArray,
      ),
    ),
    Rec.fromEntries,
  );

const boundsFor =
  (ranges: Readonly<Record<string, Bounds>>) =>
  (sounding: Sounding): Option.Option<Bounds> =>
    pipe(
      ranges,
      Rec.get(sounding.track),
      Option.orElse(() =>
        pipe(
          sounding.role,
          Option.flatMap((role) => pipe(ranges, Rec.get(role))),
        ),
      ),
    );

const checkNote =
  (report: Reporter) =>
  (sounding: Sounding, bounds: Bounds): void => {
    if (sounding.midi < bounds.low || sounding.midi > bounds.high) {
      report(`${String(sounding.line)}:${String(sounding.column)}`, {
        line: sounding.line,
        column: sounding.column,
        message: `${nameOf(sounding.midi)} in ${sounding.track} is outside ${nameOf(bounds.low)}-${nameOf(bounds.high)}`,
        detail: "Move the phrase an octave, or set the range of this track",
      });
    }
  };

export const partRange: Rule = defineRule({
  meta: { description: "Each part stays inside the range its singer or instrument can play" },
  check: (context) => {
    const check = checkNote(reporterOf(context));
    const lookup = boundsFor(rangesOf(context.options));
    for (const sounding of context.soundings) {
      for (const bounds of Option.toArray(lookup(sounding))) {
        check(sounding, bounds);
      }
    }
  },
});
