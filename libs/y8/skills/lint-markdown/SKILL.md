---
name: lint-markdown
description: >
  Use when setting up @r_masseater/y8 in vite.config.ts, writing a Markdown lint rule in
  TypeScript with defineRule, running markdownlint custom rules through it, or fixing what it
  reports. Covers rule severity and options, inline disable comments, and the CLI.
metadata:
  type: core
  library: "@r_masseater/y8"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/shared/config/types.ts
---

# lint-markdown

y8 is a Markdown linter written in Rust. Its built-in rules give the same results as
markdownlint's MD001 to MD060. They are named `markdownlint/<MDxxx or alias>`.

## Setup

```sh
vp add -D @r_masseater/y8
```

```ts
import "@r_masseater/y8/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  y8: {
    rules: {
      "markdownlint/MD013": "off",
      "markdownlint/MD024": ["error", { siblings_only: true }],
    },
    ignores: ["vendor/**"],
  },
});
```

Every built-in rule is on as an error unless `rules` says otherwise. A rule entry is `"off"`,
`"warn"`, `"error"`, or a tuple of the severity and markdownlint's options for that rule.

Run `y8` in the repository root. It lints the Markdown files git tracks and prints
`path:line:column severity rule message`. It exits with 1 when any error is reported.

## Per-file rules and presets

`overrides` takes `{ files, rules }` entries, as oxlint does. Globs starting with `!` exclude files,
and later entries win.

`docsPreset(options)` returns a config with rules for README.md, AGENTS.md and SKILL.md, general link and
privacy rules, and the `agnix` plugin. `agnix` runs the agnix rules for agent files; turn one off with
`"agnix/<ID>": "off"`.

## Rules in TypeScript

```ts
import { definePlugin, defineRule } from "@r_masseater/y8";

const noTodo = defineRule({
  meta: { description: "No TODO left in the docs" },
  create: (context) => ({
    text: (node) => {
      if (context.textOf(node).includes("TODO")) {
        context.report({ node, message: "Resolve the TODO" });
      }
    },
  }),
});

export const local = definePlugin({ rules: { "no-todo": noTodo } });
```

Register it as `plugins: { local }` and turn it on with `"local/no-todo": "error"`. Visitors are
keyed by node type, and `<type>:exit` runs after the children. The context also gives the parsed
`frontmatter`, `exists(path)` and `filesUnder(directory)` for repository files, and the nearest
`manifest` (package.json).

## markdownlint custom rules

Pass existing markdownlint custom rules as `definePlugin({ markdownlintRules: [rule] })`.
Install `markdownlint` next to y8. They run through markdownlint itself under the plugin's
name, such as `legacy/no-here`.

## Inline comments

markdownlint's comments work, and `y8-` works in place of `markdownlint-`, as in
`<!-- y8-disable-next-line MD033 -->`. Turn them off with `inlineConfig: false`.

## Japanese tokens

`morphemesOf(text)` returns kuromoji-shaped morphemes (`surface_form`, `pos`, `pos_detail_1`,
`basic_form`, `reading`, `word_position`, ...) from the IPADIC dictionary built into the addon,
so a rule can look at Japanese words. `@r_masseater/y8/kuromojin` exports `tokenize` and
`getTokenizer` with kuromojin's signatures.
