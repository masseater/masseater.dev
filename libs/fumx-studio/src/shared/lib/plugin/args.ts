import type { PluginArgument, PluginValue } from "@r_masseater/fumx-parser";
import { Array as Arr, Match, Option, pipe } from "effect";

type Of<Kind extends PluginValue["kind"]> = Extract<PluginValue, { readonly kind: Kind }>;

const valueOf =
  (args: readonly PluginArgument[]) =>
  (name: string): Option.Option<PluginValue> =>
    pipe(
      args,
      Arr.findLast((argument) => argument.name === name),
      Option.map((argument) => argument.value),
    );

const isNumber = (value: PluginValue): value is Of<"number"> => value.kind === "number";

const isText = (value: PluginValue): value is Of<"text"> => value.kind === "text";

const valueIn =
  <Wanted extends PluginValue & Readonly<{ value: unknown }>>(
    isWanted: (value: PluginValue) => value is Wanted,
  ) =>
  (args: readonly PluginArgument[]) =>
  (name: string): Option.Option<Wanted["value"]> =>
    pipe(
      valueOf(args)(name),
      Option.filter(isWanted),
      Option.map((value) => value.value),
    );

export const numberIn = valueIn(isNumber);

export const textIn = valueIn(isText);

export const flagIn =
  (args: readonly PluginArgument[]) =>
  (name: string): boolean =>
    pipe(
      valueOf(args)(name),
      Option.exists((value) => value.kind === "flag" && value.value),
    );

const shownOf = (value: PluginValue): string =>
  Match.value(value).pipe(
    Match.discriminatorsExhaustive("kind")({
      number: (given) => String(given.value),
      decibels: (given) => `${String(given.value)}dB`,
      share: (given) => `${String(given.value)}%`,
      hertz: (given) => `${String(given.value)}Hz`,
      milliseconds: (given) => `${String(given.value)}ms`,
      semitones: (given) => `${String(given.value)}st`,
      ticks: (given) => `${String(given.value)}t`,
      pitch: (given) => `${String(given.midi)}+${String(given.cents)}c`,
      text: (given) => `"${given.value}"`,
      flag: (given) => String(given.value),
    }),
  );

export const keyOf = (args: readonly PluginArgument[]): string =>
  pipe(
    args,
    Arr.map((argument) => `${argument.name}=${shownOf(argument.value)}`),
    Arr.join(" "),
  );
