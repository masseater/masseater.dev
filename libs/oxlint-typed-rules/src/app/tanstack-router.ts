import tanstackRouter from "@tanstack/eslint-plugin-router";

import { plainRules, upstreamPlugin } from "#/entities/upstream-plugin/index.ts";
import type { UpstreamPlugin } from "#/entities/upstream-plugin/index.ts";

export type ConfigName = "recommended" | "flat/recommended";

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin(
  "tanstack-router",
  tanstackRouter,
  plainRules,
);

export default plugin;
