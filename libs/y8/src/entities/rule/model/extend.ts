import { layersOf, mergedLayers } from "@masseater.dev/lint-host";
import { Array as Arr, Option, pipe } from "effect";

import type { Y8Config } from "#/shared/config/index.ts";

type Layer = Omit<Y8Config, "extends">;

const lastInlineConfig = (layers: readonly Layer[]): Partial<Pick<Y8Config, "inlineConfig">> =>
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
    ...mergedLayers(layers),
    ...lastInlineConfig(layers),
  };
};
