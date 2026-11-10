import tanstackStart from "@tanstack/eslint-plugin-start";
import type { Plugin } from "vite-plus/lint/plugins";

import { typedRules } from "./typed-rule.ts";

const plugin: Plugin & { readonly meta: { readonly name: string } } = {
  meta: { name: "tanstack-start" },
  rules: typedRules(tanstackStart.rules),
};

export default plugin;
