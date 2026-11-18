import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Y8Config } from "#/shared/config/index.ts";

const recordOf = <Value>(
  records: readonly (Readonly<Record<string, Value>> | undefined)[],
): Readonly<Record<string, Value>> =>
  pipe(
    records,
    Arr.flatMap((record) => Rec.toEntries(record ?? {})),
    Rec.fromEntries,
  );

const layersOf = (config: Y8Config): readonly Y8Config[] => {
  const { extends: bases = [], ...own } = config;
  return [...pipe(bases, Arr.flatMap(layersOf)), own];
};

const lastInlineConfig = (layers: readonly Y8Config[]): Partial<Pick<Y8Config, "inlineConfig">> =>
  pipe(
    layers,
    Arr.findLast((layer) => Option.fromNullishOr(layer.inlineConfig)),
    Option.match({
      onNone: () => ({}),
      onSome: (inlineConfig) => ({ inlineConfig }),
    }),
  );

export const flattenConfig = (config: Y8Config): Y8Config => {
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
    overrides: pipe(
      layers,
      Arr.flatMap((layer) => layer.overrides ?? []),
    ),
    ...lastInlineConfig(layers),
  };
};
