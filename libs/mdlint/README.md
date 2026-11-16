# @r_masseater/mdlint

A Markdown linter written in Rust and configured from `vite.config.ts`.

Its built-in rules give the same results as markdownlint's MD001 to MD060.
Rules can also be written in TypeScript, and markdownlint custom rules run
unchanged.

```ts
import { definePlugin, defineRule } from "@r_masseater/mdlint";
import "@r_masseater/mdlint/vite";
import { defineConfig } from "vite-plus";

const oneTitle = defineRule({
  meta: { description: "A document has one top-level heading" },
  create: (context) => ({
    heading: (node) => {
      if (node.data.level === 1 && node.start > 0) {
        context.report({ node, message: "Use one top-level heading" });
      }
    },
  }),
});

export default defineConfig({
  mdlint: {
    plugins: { local: definePlugin({ rules: { "one-title": oneTitle } }) },
    rules: {
      "markdownlint/MD013": "off",
      "local/one-title": "error",
    },
    ignores: ["vendor/**"],
  },
});
```

Run `mdlint` to lint the Markdown files git tracks, or call `lint` from code.
