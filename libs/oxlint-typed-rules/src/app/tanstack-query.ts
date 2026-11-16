import tanstackQuery from "@tanstack/eslint-plugin-query";

import { optionallyTypedRules } from "#/entities/typed-rule/index.ts";
import { upstreamPlugin } from "#/entities/upstream-plugin/index.ts";
import type { UpstreamPlugin } from "#/entities/upstream-plugin/index.ts";

export type ConfigName =
  | "recommended"
  | "recommendedStrict"
  | "flat/recommended"
  | "flat/recommended-strict";

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin(
  "tanstack-query",
  tanstackQuery,
  optionallyTypedRules,
);

export default plugin;
