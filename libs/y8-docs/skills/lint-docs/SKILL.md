---
name: lint-docs
description: >
  Use when applying @r_masseater/y8-docs to a repository, choosing its docsPreset options, or
  fixing what its docs/ rules report on README.md, AGENTS.md and SKILL.md.
metadata:
  type: core
  library: "@r_masseater/y8-docs"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/features/check-documents/model/preset.ts
---

# lint-docs

y8-docs is a y8 plugin. Its rules are named `docs/<rule>` and run on the tree y8 has already
parsed, so they add no second parse.

## Setup

```ts
import "@r_masseater/y8/vite";
import { docsPreset } from "@r_masseater/y8-docs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  y8: docsPreset({
    agents: { sections: [["Tech stack"], ["Commands"], ["Rules"]], commands: ["Commands"] },
    skills: { purpose: ["Purpose"] },
  }),
});
```

`docsPreset(options)` returns a whole y8 config. The general link and privacy rules apply to every
Markdown file. The `readme-*`, `agents-*` and `skill-*` rules apply only to `README.md`, `AGENTS.md`
or `CLAUDE.md`, and `skills/*/SKILL.md`. The root AGENTS.md gets the section, command and stack
rules, and other AGENTS.md files must stay short. AGENTS.md must be written in English.

To add other plugins or rules, spread the result and merge `plugins` and `rules`. To use single
rules in your own config, register `docsPlugin` as `plugins: { docs: docsPlugin }`.

## Options

- `agents.sections` lists the headings the root AGENTS.md needs, each as a list of accepted names.
- `agents.commands` and `agents.stack` name the headings whose content must be a command block and a
  one-sentence stack.
- `agents.skillNames` and `skills.skillNames` take `{ index, names }`: only `index` may name other skills.
- `skills.purpose` and `skills.usecases` name the headings SKILL.md must open with and keep procedures in.
- `emails` lists addresses `docs/no-email` allows.
