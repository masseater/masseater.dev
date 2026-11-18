import { layersOf, mergedLayers } from "@masseater.dev/lint-host";
import { Array as Arr, Option, pipe } from "effect";

import type { Y8Config } from "#/shared/config/index.ts";

type Layer = Omit<Y8Config, "extends">;

type Switch = "inlineConfig" | "cache";

const lastOf =
  (key: Switch) =>
  (layers: readonly Layer[]): Partial<Pick<Y8Config, Switch>> =>
    pipe(
      layers,
      Arr.findLast((layer) => Option.fromNullishOr(layer[key])),
      Option.match({
        onNone: () => ({}),
        onSome: (value) => ({ [key]: value }),
      }),
    );

export const flattenConfig = (config: Y8Config): Y8Config => {
  const layers = layersOf(config);
  return {
    ...mergedLayers(layers),
    ...lastOf("inlineConfig")(layers),
    ...lastOf("cache")(layers),
  };
};
