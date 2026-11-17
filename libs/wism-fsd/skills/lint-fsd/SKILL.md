---
name: lint-fsd
description: >
  Use when applying @r_masseater/wism-fsd to a repository, declaring directory kinds with marker
  files, laying out TypeScript workspaces or Rust crates in Feature-Sliced Design layers, or fixing
  what its fsd/ rules report.
metadata:
  type: core
  library: "@r_masseater/wism-fsd"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/app/preset.ts
  - src/entities/kind/model/presets.ts
---

# lint-fsd

wism-fsd is a wism plugin. Its rules are named `fsd/<rule>` and run on the import graph the wism
engine has already read.

## Setup

```ts
import "@r_masseater/wism/vite";
import { fsdPreset, rustCrate, skill, workspace } from "@r_masseater/wism-fsd";
import { defineConfig } from "vite-plus";

export default defineConfig({
  wism: fsdPreset({ kinds: [workspace({ paths: ["apps/*", "libs/*"] }), rustCrate(), skill()] }),
});
```

`fsdPreset` turns every rule on as an error. Override one with `rules`, such as
`"fsd/link-target": "warn"`.

## Kinds

A kind has a `name`, a `marker` file and optional `paths` globs that the marker's directory must
match. A file belongs to the innermost directory that holds a marker.

- `placements` list which files (`files`) may sit where (`allow`). A file outside them is a
  `fsd/placement` error.
- `layers` split `dir` into the ordered layers `order`. `sliced` layers hold slices, `segmented`
  layers hold segments, `entries` are a slice's public API, `open` globs may be imported directly,
  `cross` names the folder for cross-imports such as `@x`, and `moduleFiles` lets Rust use
  `features.rs` next to `features/`.

The presets `workspace`, `rustCrate` and `skill` cover package.json workspaces in FSD, Cargo crates
in FSD and the Agent Skill layout. `fsd` returns the first two.

## Rules

`placement`, `loose-file`, `layer-name`, `layer-import`, `cross-slice`, `public-api`,
`wildcard-export` and `link-target`.

- Move a module down a layer or into its own slice when `layer-import` or `cross-slice` fires.
- Import a slice through its `index.*` when `public-api` fires.
- Track the linked file or fix the path when `link-target` fires.
