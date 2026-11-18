import { layersOf, mergedLayers } from "@masseater.dev/lint-host";

import type { I68Config } from "#/shared/config/index.ts";

export const flattenConfig = (config: I68Config): I68Config => {
  const { plugins, rules, ignores } = mergedLayers(layersOf(config));
  return { plugins, rules, ignores };
};
