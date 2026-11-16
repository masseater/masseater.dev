import { configs, rules } from "eslint-plugin-drizzle";

import { plainRules, upstreamPlugin } from "#/entities/upstream-plugin/index.ts";
import type { ConfigNameOf, UpstreamPlugin } from "#/entities/upstream-plugin/index.ts";

type ConfigName = ConfigNameOf<typeof configs>;

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin(
  "drizzle",
  { configs, rules },
  plainRules,
);

export default plugin;
