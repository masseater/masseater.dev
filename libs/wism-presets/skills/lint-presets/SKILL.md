---
name: lint-presets
description: >
  Use when applying @r_masseater/wism-presets to a repository, choosing which presets (fsd,
  placement, links) to turn on, declaring directory kinds with marker files, laying out TypeScript
  workspaces or Rust crates in Feature-Sliced Design layers, or fixing what its structure/ rules
  report.
metadata:
  type: core
  library: "@r_masseater/wism-presets"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/app/preset.ts
  - src/entities/kind/model/presets.ts
---

# lint-presets

wism-presets is the official set of wism presets. Its rules belong to the plugin `structure`, are
named `structure/<rule>`, and run on the import graph the wism engine has already read.

## Setup

```ts
import "@r_masseater/wism/vite";
import { rustCrate, skill, structure, workspace } from "@r_masseater/wism-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  wism: structure({
    kinds: [workspace({ paths: ["apps/*", "libs/*"] }), rustCrate(), skill()],
    presets: ["fsd", "placement", "links"],
  }),
});
```

`presets` picks the concerns and defaults to all of them: `fsd` turns on `layer-name`,
`loose-file`, `layer-import`, `cross-slice`, `public-api` and `wildcard-export`, `placement` turns
on `placement`, and `links` turns on `link-target`. Each chosen rule is an error. Override one with
`rules`, such as `"structure/link-target": "warn"`.

## Kinds

A kind has a `name`, a `marker` file and optional `paths` globs that the marker's directory must
match. A file belongs to the innermost directory that holds a marker.

- `placements` list which files (`files`) may sit where (`allow`). A file outside them is a
  `structure/placement` error.
- `layers` split `dir` into the ordered layers `order`. `sliced` layers hold slices, `segmented`
  layers hold segments, `entries` are a slice's public API, `open` globs may be imported directly,
  `cross` names the folder for cross-imports such as `@x`, and `moduleFiles` lets Rust use
  `features.rs` next to `features/`.

The presets `workspace`, `rustCrate` and `skill` cover package.json workspaces in FSD, Cargo crates
in FSD and the Agent Skill layout.

## Rules

`placement`, `loose-file`, `layer-name`, `layer-import`, `cross-slice`, `public-api`,
`wildcard-export` and `link-target`.

- Move a module down a layer or into its own slice when `layer-import` or `cross-slice` fires.
- Import a slice through its `index.*` when `public-api` fires.
- Track the linked file or fix the path when `link-target` fires.
