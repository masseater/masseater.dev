import { Array as Arr, Record as Rec, pipe } from "effect";

import type { Fu4Config } from "#/shared/config/index.ts";

const recordOf = <Value>(
  records: readonly (Readonly<Record<string, Value>> | undefined)[],
): Readonly<Record<string, Value>> =>
  pipe(
    records,
    Arr.flatMap((record) => Rec.toEntries(record ?? {})),
    Rec.fromEntries,
  );

const layersOf = (config: Fu4Config): readonly Fu4Config[] => {
  const { extends: bases = [], ...own } = config;
  return [...pipe(bases, Arr.flatMap(layersOf)), own];
};

export const flattenConfig = (config: Fu4Config): Fu4Config => {
  const layers = layersOf(config);
  return {
    plugins: recordOf(
      pipe(
        layers,
        Arr.map((layer) => layer.plugins),
      ),
    ),
    rules: recordOf(
      pipe(
        layers,
        Arr.map((layer) => layer.rules),
      ),
    ),
    settings: recordOf(
      pipe(
        layers,
        Arr.map((layer) => layer.settings),
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
  };
};
