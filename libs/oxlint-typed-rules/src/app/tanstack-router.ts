import tanstackRouter from "@tanstack/eslint-plugin-router";

import { plainRules, upstreamPlugin } from "#/entities/upstream-plugin/index.ts";
import type { ConfigNameOf, UpstreamPlugin } from "#/entities/upstream-plugin/index.ts";

type ConfigName = ConfigNameOf<typeof tanstackRouter.configs>;

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin(
  "tanstack-router",
  tanstackRouter,
  plainRules,
);

export default plugin;
