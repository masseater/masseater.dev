---
name: apply-presets
description: >
  Use when choosing which @r_masseater/y8-presets presets a repository extends, setting their
  options, or fixing what their docs/, readme/, agents-md/ and skill-md/ rules report.
metadata:
  type: core
  library: "@r_masseater/y8-presets"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/features/check-documents/model/recommended.ts
---

# apply-presets

Each preset returns a y8 config for one concern. A config lists the presets it wants in
`extends`; its own `rules` and `overrides` come after them and win. The rules run on the tree y8
has already parsed, so they add no second parse.

## Setup

```ts
import "@r_masseater/y8/vite";
import { recommended } from "@r_masseater/y8-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  y8: {
    extends: [
      recommended({
        agents: { sections: [["Tech stack"], ["Commands"], ["Rules"]], commands: ["Commands"] },
        skills: { purpose: ["Purpose"] },
      }),
    ],
    rules: { "agnix/XP-001": "off" },
  },
});
```

## Presets

- `documents({ emails })` turns on `docs/*` in every Markdown file. `emails` lists addresses `docs/no-email` allows.
- `readme()` turns on `readme/*` in `README.md`.
- `agentsMd(options)` turns on `agents-md/*` in `AGENTS.md` and `CLAUDE.md`. The root file gets the
  section, command and stack rules; other AGENTS.md files must stay short. AGENTS.md must be in English.
- `skillMd(options)` turns on `skill-md/*` in `skills/*/SKILL.md`.
- `markdownStyle()` sets the built-in `markdownlint/*` rules.
- `agentConfig()` registers y8's built-in agnix plugin as `agnix`.
- `recommended(options)` extends all of them.

## Options

- `agentsMd`: `sections` lists the headings the root AGENTS.md needs, each as a list of accepted
  names. `commands` and `stack` name the headings whose content must be a command block and a
  one-sentence stack. `rootTitle` fixes the root title.
- `agentsMd` and `skillMd` take `skillNames: { index, names }`: only `index` may name other skills.
- `skillMd`: `purpose` and `usecases` name the headings SKILL.md must open with and keep procedures in.
- `recommended` takes `emails`, `agents` (the `agentsMd` options) and `skills` (the `skillMd` options).

To use single rules in your own config, register a plugin such as `readmePlugin` as
`plugins: { readme: readmePlugin }` and turn its rules on.
