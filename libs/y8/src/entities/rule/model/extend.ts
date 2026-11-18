import { flattenLayers } from "@masseater.dev/lint-host";
import { Array as Arr, Option, pipe } from "effect";

import type { Plugin, Y8Config } from "#/shared/config/index.ts";

const lastInlineConfig = (
  layers: readonly Omit<Y8Config, "extends">[],
): Partial<Pick<Y8Config, "inlineConfig">> =>
  pipe(
    layers,
    Arr.findLast((layer) => Option.fromNullishOr(layer.inlineConfig)),
    Option.match({
      onNone: () => ({}),
      onSome: (inlineConfig) => ({ inlineConfig }),
    }),
  );

export const flattenConfig = (config: Y8Config): Y8Config => {
  const { layers, plugins, rules, ignores } = flattenLayers<Plugin, Y8Config>(config);
  return {
    plugins,
    rules,
    ignores,
    overrides: pipe(
      layers,
      Arr.flatMap((layer) => layer.overrides ?? []),
    ),
    ...lastInlineConfig(layers),
  };
};
