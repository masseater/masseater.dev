# @r_masseater/y8

![y8 logo](logo.svg)

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

`y8` keeps the built-in rules' results in `node_modules/.cache/y8`, keyed by the file's
content, the config and the y8 build, and reuses them on the next run. Set
`cache: false` to turn this off.

## Japanese tokenizer

`morphemesOf` splits Japanese text into morphemes with
[Lindera](https://github.com/lindera/lindera) and the IPADIC dictionary built
into the addon. `@r_masseater/y8/kuromojin` has the same exports as
`kuromojin`, so textlint rules that use kuromojin can run on it.

## Comparison

Measured on 2026-11-18 on linux x64, 4 CPUs with [lint-bench](https://github.com/masseater/masseater.dev/tree/main/tools/lint-bench), which keeps the full results in [results.md](https://github.com/masseater/masseater.dev/blob/main/tools/lint-bench/results/results.md). Cold runs drop the page cache and the tools' caches first. "Same as ours", "Only ours" and "Only theirs" compare findings by file, line and rule where both tools use the same rules.

y8 reports the same findings as markdownlint-cli2 apart from a few lines, and runs 5 to 30 times faster. rumdl is faster still; its defaults differ from markdownlint (it adds MD043, MD057 and MD067 findings and drops MD060), so its findings overlap only in part.

### masseater.dev

| Tool              | Version                                                 | Cold   | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------------- | ------------------------------------------------------- | ------ | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| rumdl             | 0.3.4                                                   | 231 ms | 55 ms ± 5 ms    | 48 MB    | 7162     | 3800         | 2538      | 3362        |
| **y8**            | workspace                                               | 895 ms | 549 ms ± 39 ms  | 251 MB   | 6338     |              |           |             |
| markdownlint-cli2 | 0.24.1                                                  | 2.96 s | 2.81 s ± 138 ms | 305 MB   | 6340     | 6338         | 0         | 2           |
| remark-lint       | remark-cli 12.0.1, remark-preset-lint-recommended 7.0.1 | 3.50 s | 3.25 s ± 187 ms | 336 MB   | 5080     |              |           |             |

- y8: Markdown files git tracks, markdownlint's default rules
- markdownlint-cli2: Markdown files git tracks, markdownlint's default rules
- rumdl: Markdown files git tracks, markdownlint's default rules
- remark-lint: Markdown files git tracks, remark-preset-lint-recommended

### nodejs/node

| Tool              | Version                                                 | Cold    | Warm           | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------------- | ------------------------------------------------------- | ------- | -------------- | -------- | -------- | ------------ | --------- | ----------- |
| rumdl             | 0.3.4                                                   | 899 ms  | 131 ms ± 13 ms | 160 MB   | 92719    | 84761        | 16312     | 7958        |
| **y8**            | workspace                                               | 2.07 s  | 1.13 s ± 86 ms | 472 MB   | 101073   |              |           |             |
| remark-lint       | remark-cli 12.0.1, remark-preset-lint-recommended 7.0.1 | 32.37 s | 31.20 s ± 0 ms | 1701 MB  | 8508     |              |           |             |
| markdownlint-cli2 | 0.24.1                                                  | 35.20 s | 35.58 s ± 0 ms | 1198 MB  | 101075   | 101071       | 2         | 4           |

- y8: Markdown files git tracks, markdownlint's default rules
- markdownlint-cli2: Markdown files git tracks, markdownlint's default rules
- rumdl: Markdown files git tracks, markdownlint's default rules
- remark-lint: Markdown files git tracks, remark-preset-lint-recommended

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/y8#<skill>`.
