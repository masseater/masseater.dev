import { Record as Rec, pipe } from "effect";
import type { Plugin } from "vite-plus/lint/plugins";

import { ecosystemReaders } from "./ecosystem-readers.ts";
import { getOrInsert } from "./get-or-insert.ts";
import { inlineExports } from "./inline-exports.ts";
import { ruleOf } from "./intent-rule.ts";
import { INTENTS } from "./intents.ts";

export const mschLintPlugin: Plugin & { readonly meta: { readonly name: string } } = {
  meta: { name: "msch-lint" },
  rules: {
    "ecosystem-readers": ecosystemReaders,
    "get-or-insert": getOrInsert,
    "inline-exports": inlineExports,
    ...pipe(INTENTS, Rec.map(ruleOf)),
  },
};
