import { Record as Rec, pipe } from "effect";
import type { Plugin } from "vite-plus/lint/plugins";

import { inlineExports } from "./inline-exports.ts";
import { ruleOf } from "./intent-rule.ts";
import { INTENTS } from "./intents.ts";

export const mschLintPlugin: Plugin & { readonly meta: { readonly name: string } } = {
  meta: { name: "msch-lint" },
  rules: { "inline-exports": inlineExports, ...pipe(INTENTS, Rec.map(ruleOf)) },
};
