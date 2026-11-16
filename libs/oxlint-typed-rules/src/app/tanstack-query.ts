import tanstackQuery from "@tanstack/eslint-plugin-query";

import { optionallyTypedRules } from "#/entities/typed-rule/index.ts";
import { upstreamPlugin } from "#/entities/upstream-plugin/index.ts";
import type { ConfigNameOf, UpstreamPlugin } from "#/entities/upstream-plugin/index.ts";

type ConfigName = ConfigNameOf<typeof tanstackQuery.configs>;

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin(
  "tanstack-query",
  tanstackQuery,
  optionallyTypedRules,
);

export default plugin;
