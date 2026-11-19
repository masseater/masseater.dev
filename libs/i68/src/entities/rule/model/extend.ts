import { layersOf, mergedLayers, mergedRules } from "@masseater.dev/lint-host";
import { Array as Arr, pipe } from "effect";

import type { I68Config } from "#/shared/config/index.ts";

export const flattenConfig = (config: I68Config): I68Config => {
  const layers = layersOf(config);
  const { plugins, ignores } = mergedLayers(layers);
  const rules = mergedRules(
    pipe(
      layers,
      Arr.map((layer) => layer.rules),
    ),
  );
  return { plugins, rules, ignores };
};
