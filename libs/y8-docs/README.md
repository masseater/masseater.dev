# @r_masseater/y8-docs

y8 rules that keep README.md, AGENTS.md and SKILL.md short and in the shape agents and readers expect, with a preset that applies each set to its own files.

```sh
npm install -D @r_masseater/y8 @r_masseater/y8-docs effect
```

```ts
import "@r_masseater/y8/vite";
import { docsPreset } from "@r_masseater/y8-docs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  y8: docsPreset({ agents: { sections: [["Commands"], ["Rules"]] } }),
});
```

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/y8-docs#<skill>`.
