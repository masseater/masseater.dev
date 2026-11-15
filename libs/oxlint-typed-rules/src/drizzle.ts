import { configs, rules } from "eslint-plugin-drizzle";

import { plainRules, upstreamPlugin } from "./upstream-plugin.ts";
import type { UpstreamPlugin } from "./upstream-plugin.ts";

export type ConfigName = "all" | "recommended";

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin(
  "drizzle",
  { configs, rules },
  plainRules,
);

export default plugin;
