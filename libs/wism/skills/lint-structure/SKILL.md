---
name: lint-structure
description: >
  Use when setting up @r_masseater/wism in vite.config.ts, declaring directory kinds with marker
  files, laying out TypeScript workspaces or Rust crates in FSD layers, writing a structure rule in
  TypeScript with defineRule, or fixing what wism reports.
metadata:
  type: core
  library: "@r_masseater/wism"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/shared/config/types.ts
  - src/entities/kind/model/presets.ts
---

# lint-structure

wism checks where files sit and what they import. A marker file gives its directory a kind, and
the kind says which paths may hold files and how its source is layered.

## Setup

```sh
vp add -D @r_masseater/wism
```

```ts
import { rustCrate, skill, workspace } from "@r_masseater/wism";
import "@r_masseater/wism/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  wism: {
    kinds: [workspace({ paths: ["apps/*", "libs/*"] }), rustCrate(), skill()],
    ignores: ["**/fixtures/**"],
  },
});
```

Run `wism` in the repository root. It checks the files git tracks, leaving out files marked
`linguist-vendored`, `linguist-generated` or `linguist-documentation` and the `ignores` globs. It
prints `path:line:column severity rule message` and exits with 1 when any error is reported.

## Kinds

A kind has a `name`, a `marker` file and optional `paths` globs that the marker's directory must
match. A file belongs to the innermost directory that holds a marker.

- `placements` list which files (`files`) may sit where (`allow`). A file outside them is a
  `placement` error.
- `layers` split `dir` into the ordered layers `order`. `sliced` layers hold slices, `segmented`
  layers hold segments, `entries` are a slice's public API, `open` globs may be imported directly,
  `cross` names the folder for cross-imports such as `@x`, and `moduleFiles` lets Rust use
  `features.rs` next to `features/`.

The presets `workspace`, `rustCrate` and `skill` cover package.json workspaces in FSD, Cargo crates
in FSD and the Agent Skill layout. `fsd` returns the first two.

## Built-in rules

`placement`, `loose-file`, `layer-name`, `layer-import`, `cross-slice`, `public-api`,
`wildcard-export` and `link-target` are on as errors unless `rules` says otherwise.

- Move a module down a layer or into its own slice when `layer-import` or `cross-slice` fires.
- Import a slice through its `index.*` when `public-api` fires.
- Track the linked file or fix the path when `link-target` fires.

## Rules in TypeScript

```ts
import { definePlugin, defineRule } from "@r_masseater/wism";

const noOrphans = defineRule({
  meta: { description: "Every slice is imported by something" },
  check: ({ nodes, edges, report }) => {
    const used = new Set(edges.map((edge) => edge.target.value));
    for (const node of nodes) {
      if (node.slice !== null && !used.has(node.path)) {
        report({ path: node.path, message: "is never imported" });
      }
    }
  },
});

export const local = definePlugin({ rules: { "no-orphans": noOrphans } });
```

Register it as `plugins: { local }` and turn it on with `"local/no-orphans": "error"`. A rule gets
every file, a node per file with its kind, layer and slice, and every import edge.
