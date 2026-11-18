import { Array as Arr, Record as Rec, pipe } from "effect";

export interface Layer<Plugin, Entry, Override> {
  readonly plugins?: Readonly<Record<string, Plugin>>;
  readonly rules?: Readonly<Record<string, Entry>>;
  readonly ignores?: readonly string[];
  readonly overrides?: readonly Override[];
}

export interface Merged<Plugin, Entry, Override> {
  readonly plugins: Readonly<Record<string, Plugin>>;
  readonly rules: Readonly<Record<string, Entry>>;
  readonly ignores: readonly string[];
  readonly overrides: readonly Override[];
}

export const mergedRecords = <Value>(
  records: readonly (Readonly<Record<string, Value>> | undefined)[],
): Readonly<Record<string, Value>> =>
  pipe(
    records,
    Arr.flatMap((record) => Rec.toEntries(record ?? {})),
    Rec.fromEntries,
  );

export const layersOf = <Config extends { readonly extends?: readonly Config[] }>(
  config: Config,
): readonly Omit<Config, "extends">[] => {
  const { extends: bases = [], ...own } = config;
  return [...pipe(bases, Arr.flatMap(layersOf)), own];
};

export const mergedLayers = <Plugin, Entry, Override>(
  layers: readonly Layer<Plugin, Entry, Override>[],
): Merged<Plugin, Entry, Override> => ({
  plugins: mergedRecords(
    pipe(
      layers,
      Arr.map((layer) => layer.plugins),
    ),
  ),
  rules: mergedRecords(
    pipe(
      layers,
      Arr.map((layer) => layer.rules),
    ),
  ),
  ignores: pipe(
    layers,
    Arr.flatMap((layer) => layer.ignores ?? []),
  ),
  overrides: pipe(
    layers,
    Arr.flatMap((layer) => layer.overrides ?? []),
  ),
});
