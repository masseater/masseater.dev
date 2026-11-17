# @r_masseater/y8

A Markdown linter written in Rust and configured from `vite.config.ts`.

Its built-in rules give the same results as markdownlint's MD001 to MD060.
Rules can also be written in TypeScript, and markdownlint custom rules run
unchanged.

```ts
import { definePlugin, defineRule } from "@r_masseater/y8";
import "@r_masseater/y8/vite";
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
  y8: {
    plugins: { local: definePlugin({ rules: { "one-title": oneTitle } }) },
    rules: {
      "markdownlint/MD013": "off",
      "local/one-title": "error",
    },
    ignores: ["vendor/**"],
  },
});
```

Run `y8` to lint the Markdown files git tracks, or call `lint` from code.

## Japanese tokenizer

`morphemesOf` splits Japanese text into morphemes with
[Lindera](https://github.com/lindera/lindera) and the IPADIC dictionary built
into the addon. `@r_masseater/y8/kuromojin` has the same exports as
`kuromojin`, so textlint rules that use kuromojin can run on it.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/y8#<skill>`.
