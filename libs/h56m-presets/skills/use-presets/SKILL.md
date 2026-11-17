---
name: use-presets
description: >
  Use when choosing the rules h56m scans with, or when h56m reports that it has no rules. Covers
  extending a preset from @r_masseater/h56m-presets in vite.config.ts or makeDetector, and turning
  off single rules of a preset.
metadata:
  type: core
  library: "@r_masseater/h56m-presets"
  library_version: 0.1.0
sources:
  - src/app/index.ts
---

# use-presets

h56m holds only the engine. The rules come from a preset file that `extend.path` names, plus the
`rules` a project adds.

## Setup

```sh
vp add -D @r_masseater/h56m @r_masseater/h56m-presets
```

```ts
import "@r_masseater/h56m/vite";
import { betterleaks } from "@r_masseater/h56m-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  h56m: { extend: { path: betterleaks, disabledRules: ["generic-api-key"] } },
});
```

`betterleaks` is the default Betterleaks configuration. Pass the same `extend` to `makeDetector`
when scanning from code.

## Rules

- Do not set `extend.useDefault`. h56m rejects it, because the engine carries no rules.
- Turn off a rule with `disabledRules` instead of copying the preset and editing it.
- A preset file is a Betterleaks TOML file, so a project can also point `extend.path` at its own
  file, which may extend a preset in turn.
