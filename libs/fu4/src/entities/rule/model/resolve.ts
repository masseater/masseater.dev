import { settingOf } from "@masseater.dev/lint-host";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";
import { minimatch } from "minimatch";

import type {
  Fu4Config,
  Override,
  Rule,
  RuleEntry,
  RuleOptions,
  Severity,
} from "#/shared/config/index.ts";

const NEGATION = "!";
const SEPARATOR = "/";
const START = 0;

export interface ActiveRule {
  readonly id: string;
  readonly rule: Rule;
  readonly severity: Exclude<Severity, "off">;
  readonly options: RuleOptions;
}

interface Enabled {
  readonly id: string;
  readonly severity: Exclude<Severity, "off">;
  readonly options: RuleOptions;
}

const enabled = ([id, entry]: readonly [string, RuleEntry]): readonly Enabled[] => {
  const { severity, options } = settingOf(entry);
  if (severity === "off") {
    return [];
  }
  return [{ id, severity, options }];
};

const matches =
  (path: string) =>
  (pattern: string): boolean =>
    minimatch(path, pattern, { dot: true });

const negated = Str.startsWith(NEGATION);

const applies =
  (path: string) =>
  (override: Override): boolean =>
    pipe(
      override.files,
      Arr.filter((pattern) => !negated(pattern)),
      Arr.some(matches(path)),
    ) &&
    !pipe(
      override.files,
      Arr.filter(negated),
      Arr.map(Str.slice(NEGATION.length)),
      Arr.some(matches(path)),
    );

export const isIgnored =
  (config: Fu4Config) =>
  (path: string): boolean =>
    pipe(config.ignores ?? [], Arr.some(matches(path)));

export const entriesFor =
  (config: Fu4Config) =>
  (path: string): Readonly<Record<string, RuleEntry>> => {
    const merged: Record<string, RuleEntry> = { ...config.rules };
    for (const override of pipe(config.overrides ?? [], Arr.filter(applies(path)))) {
      Object.assign(merged, override.rules);
    }
    return merged;
  };

const ruleOf =
  (config: Fu4Config) =>
  (id: string): Option.Option<Rule> =>
    pipe(
      Str.indexOf(SEPARATOR)(id),
      Option.flatMap((at) =>
        pipe(
          Rec.get(config.plugins ?? {}, Str.slice(START, at)(id)),
          Option.flatMap((plugin) => Rec.get(plugin.rules, Str.slice(at + SEPARATOR.length)(id))),
        ),
      ),
    );

const activate =
  (config: Fu4Config) =>
  (entry: Enabled): readonly ActiveRule[] =>
    pipe(
      ruleOf(config)(entry.id),
      Option.map((rule): ActiveRule => ({ ...entry, rule })),
      Option.toArray,
    );

export const activeRules =
  (config: Fu4Config) =>
  (path: string): readonly ActiveRule[] =>
    pipe(
      Rec.toEntries(entriesFor(config)(path)),
      Arr.flatMap(enabled),
      Arr.flatMap(activate(config)),
    );
