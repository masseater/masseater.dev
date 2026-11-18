import { Array as Arr, Record as Rec, pipe } from "effect";

import type { I68Config } from "#/shared/config/index.ts";

const recordOf = <Value>(
  records: readonly (Readonly<Record<string, Value>> | undefined)[],
): Readonly<Record<string, Value>> =>
  pipe(
    records,
    Arr.flatMap((record) => Rec.toEntries(record ?? {})),
    Rec.fromEntries,
  );

const layersOf = (config: I68Config): readonly I68Config[] => {
  const { extends: bases = [], ...own } = config;
  return [...pipe(bases, Arr.flatMap(layersOf)), own];
};

export const flattenConfig = (config: I68Config): I68Config => {
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
    ignores: pipe(
      layers,
      Arr.flatMap((layer) => layer.ignores ?? []),
    ),
  };
};
