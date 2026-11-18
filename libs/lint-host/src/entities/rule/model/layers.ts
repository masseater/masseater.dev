import { Array as Arr, Match, Record as Rec, pipe } from "effect";

import type { RuleEntry, Setting, Severity } from "./setting.ts";

export interface LayeredConfig<Plugin, Config> {
  readonly extends?: readonly Config[];
  readonly plugins?: Readonly<Record<string, Plugin>>;
  readonly rules?: Readonly<Record<string, RuleEntry>>;
  readonly ignores?: readonly string[];
}

export interface Flattened<Plugin, Layer> {
  readonly layers: readonly Layer[];
  readonly plugins: Readonly<Record<string, Plugin>>;
  readonly rules: Readonly<Record<string, RuleEntry>>;
  readonly ignores: readonly string[];
}

const layersOf = <Plugin, Config extends LayeredConfig<Plugin, Config>>(
  config: Config,
): readonly Omit<Config, "extends">[] => {
  const { extends: bases = [], ...own } = config;
  return [...pipe(bases, Arr.flatMap(layersOf<Plugin, Config>)), own];
};

const mergeRecords = <Value>(
  records: readonly (Readonly<Record<string, Value>> | undefined)[],
): Readonly<Record<string, Value>> =>
  pipe(
    records,
    Arr.flatMap((record) => Rec.toEntries(record ?? {})),
    Rec.fromEntries,
  );

export const flattenLayers = <Plugin, Config extends LayeredConfig<Plugin, Config>>(
  config: Config,
): Flattened<Plugin, Omit<Config, "extends">> => {
  const layers = layersOf<Plugin, Config>(config);
  return {
    layers,
    plugins: mergeRecords(
      pipe(
        layers,
        Arr.map((layer) => layer.plugins),
      ),
    ),
    rules: mergeRecords(
      pipe(
        layers,
        Arr.map((layer) => layer.rules),
      ),
    ),
    ignores: pipe(
      layers,
      Arr.flatMap((layer) => layer.ignores ?? []),
    ),
  };
};

export const reportedSeverity = (setting: Setting): Exclude<Severity, "off"> =>
  Match.value(setting.severity).pipe(
    Match.when("warn", (): Exclude<Severity, "off"> => "warn"),
    Match.orElse((): Exclude<Severity, "off"> => "error"),
  );
