---
name: lint-structure
description: >
  Use when setting up @r_masseater/wism in vite.config.ts, writing a structure or dependency rule
  in TypeScript with defineRule and definePlugin, reading the import graph a rule receives, or
  running wism on a repository.
metadata:
  type: core
  library: "@r_masseater/wism"
  library_version: 0.2.0
sources:
  - src/app/index.ts
  - src/shared/config/types.ts
---

# lint-structure

wism is an engine. It reads the import graph of the files git tracks and runs the TypeScript rules
that plugins give it. It reports nothing on its own: add a plugin such as `@r_masseater/wism-presets`.

## Setup

```sh
vp add -D @r_masseater/wism @r_masseater/wism-presets
```

```ts
import "@r_masseater/wism/vite";
import { rustCrate, skill, structure, workspace } from "@r_masseater/wism-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  wism: {
    ...structure({ kinds: [workspace({ paths: ["apps/*", "libs/*"] }), rustCrate(), skill()] }),
    ignores: ["**/fixtures/**"],
  },
});
```

Run `wism` in the repository root. It checks the files git tracks, leaving out files marked
`linguist-vendored`, `linguist-generated` or `linguist-documentation` and the `ignores` globs. It
prints `path:line:column severity rule message` and exits with 1 when any error is reported.

## Rules in TypeScript

```ts
import { definePlugin, defineRule } from "@r_masseater/wism";

const noOrphans = defineRule({
  meta: { description: "Every TypeScript file is imported by something" },
  check: ({ files, edges, report }) => {
    const used = new Set(edges.map((edge) => edge.target.value));
    for (const file of files) {
      if (file.endsWith(".ts") && !used.has(file)) {
        report({ path: file, message: "is never imported" });
      }
    }
  },
});

export const local = definePlugin({ rules: { "no-orphans": noOrphans } });
```

Register it as `plugins: { local }` and turn it on with `"local/no-orphans": "error"`. Every rule is
named `plugin/rule`; a rule name without a configured plugin is an error.

A rule gets the repository `root`, every tracked file and every edge. An edge has `from`, the
written `specifier`, its `line` and `column`, `wildcard` for `export *`, and a `target` that is
either `{ type: "file", value: path }` for a resolved script import or a Markdown link, or
`{ type: "module", value: ["features", "sync"] }` for a Rust `crate::`, `self::` or `super::` path
inside its crate.
