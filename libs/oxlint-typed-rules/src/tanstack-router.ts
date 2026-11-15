import tanstackRouter from "@tanstack/eslint-plugin-router";

import { plainRules, upstreamPlugin } from "./upstream-plugin.ts";
import type { UpstreamPlugin } from "./upstream-plugin.ts";

export type ConfigName = "recommended" | "flat/recommended";

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin(
  "tanstack-router",
  tanstackRouter,
  plainRules,
);

export default plugin;
