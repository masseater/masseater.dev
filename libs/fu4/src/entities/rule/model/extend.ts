import { layersOf, mergedLayers, mergedRecords } from "@masseater.dev/lint-host";
import { Array as Arr, pipe } from "effect";

import type { Fu4Config } from "#/shared/config/index.ts";

export const flattenConfig = (config: Fu4Config): Fu4Config => {
  const layers = layersOf(config);
  return {
    ...mergedLayers(layers),
    settings: mergedRecords(
      pipe(
        layers,
        Arr.map((layer) => layer.settings),
      ),
    ),
  };
};
