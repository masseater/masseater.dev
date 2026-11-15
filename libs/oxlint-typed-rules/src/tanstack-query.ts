import tanstackQuery from "@tanstack/eslint-plugin-query";

import { optionallyTypedRules } from "./typed-rule.ts";
import { upstreamPlugin } from "./upstream-plugin.ts";
import type { UpstreamPlugin } from "./upstream-plugin.ts";

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
