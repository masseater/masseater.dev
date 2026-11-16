import { configs, rules } from "eslint-plugin-drizzle";

import { plainRules, upstreamPlugin } from "#/entities/upstream-plugin/index.ts";
import type { UpstreamPlugin } from "#/entities/upstream-plugin/index.ts";

export type ConfigName = "all" | "recommended";

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin(
  "drizzle",
  { configs, rules },
  plainRules,
);

export default plugin;
