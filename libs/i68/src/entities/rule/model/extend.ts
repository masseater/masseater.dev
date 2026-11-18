import { flattenLayers } from "@masseater.dev/lint-host";

import type { I68Config, Plugin } from "#/shared/config/index.ts";

export const flattenConfig = (config: I68Config): I68Config => {
  const { plugins, rules, ignores } = flattenLayers<Plugin, I68Config>(config);
  return { plugins, rules, ignores };
};
