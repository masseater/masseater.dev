import type { Rule, RuleEntry } from "@r_masseater/y8";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

const SEPARATOR = "/";

export type Rules = Readonly<Record<string, RuleEntry>>;

export interface SkillNameOptions {
  readonly index?: string;
  readonly names?: readonly string[];
}

export interface RuleSet {
  readonly plugin: string;
  readonly rules: Readonly<Record<string, Rule>>;
}

const idOf = (plugin: string, name: string): string => `${plugin}${SEPARATOR}${name}`;

export const turned =
  (entry: RuleEntry) =>
  ({ plugin, rules }: RuleSet): Rules =>
    pipe(
      Rec.keys(rules),
      Arr.map((name): readonly [string, RuleEntry] => [idOf(plugin, name), entry]),
      Rec.fromEntries,
    );

export const withOptions =
  (plugin: string) =>
  (name: string, options: Readonly<Record<string, unknown>>): Rules => ({
    [idOf(plugin, name)]: ["error", options],
  });

export const whenGiven =
  <Value>(build: (value: Value) => Rules) =>
  (value: Value | undefined): Rules =>
    pipe(Option.fromNullishOr(value), Option.match({ onNone: (): Rules => ({}), onSome: build }));

export const skillNameOptions = ({
  index,
  names = [],
}: SkillNameOptions): Readonly<Record<string, unknown>> => ({
  names,
  allow: Option.toArray(Option.fromNullishOr(index)),
  ...pipe(
    Option.fromNullishOr(index),
    Option.match({
      onNone: (): Readonly<Record<string, unknown>> => ({}),
      onSome: (value): Readonly<Record<string, unknown>> => ({ index: value }),
    }),
  ),
});
