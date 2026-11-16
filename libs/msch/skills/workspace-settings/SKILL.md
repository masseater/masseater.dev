---
name: workspace-settings
description: >
  Use when one workspace of a repository that uses @r_masseater/msch needs its own lint override,
  ignore pattern, test-only dependency, install size limit or extra verify step: the msch block of
  that workspace's vite.config.ts. Also use when msch reports that such a setting is not literal or
  names an unknown set.
metadata:
  type: core
  library: "@r_masseater/msch"
  library_version: 0.31.0
sources:
  - src/app/vite.d.ts
  - src/features/workspace-settings/**
  - src/entities/workspace/**
---

# workspace-settings

Vite+ ignores the `lint` section of a workspace's `vite.config.ts`. A setting that applies to one workspace goes in the `msch` block of that workspace's `vite.config.ts`. The root reads it with `workspaceSettings` without running the file, so every value in the block is a literal.

## The msch block

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "16.5 MB" },
    lint: {
      ignorePatterns: ["src/generated/**"],
      overrides: [
        { files: ["src/**/*.server.ts"], excludeFiles: ["**/*.test.ts"], use: ["traced"] },
        { files: ["src/app/cli.ts"], rules: { "node/no-sync": "off" } },
      ],
    },
    devDependencies: {
      "Workers spans are tested by running the Worker in Miniflare": {
        dependencies: ["miniflare"],
      },
    },
  },
  run: { tasks: { verify: { command: [], dependsOn: ["build"] } } },
});
```

| Key                   | Holds                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `lint.ignorePatterns` | Paths in the workspace that oxlint skips                                                                                    |
| `lint.overrides`      | Oxlint overrides. `use` names a rule set the root passes to `workspaceSettings`                                             |
| `devDependencies`     | Each key states why the workspace needs the packages. `dependencies` lists them, `use` names a dependency set from the root |
| `publish.installSize` | The largest install size a published package may reach                                                                      |

## Rules

Write values, not imports or function calls.
When several workspaces need the same rules, the root defines a set and each workspace names it in `use`.

Write `run.tasks.verify` in the workspace's own `vite.config.ts`.
The root verify reads the file without running it, so a verify task built by code elsewhere never runs.

Keep repository-wide settings such as `comments.allow` and `workspaceAgentsMd` in the root `msch` block.
