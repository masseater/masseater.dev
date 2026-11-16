---
name: repository-config
description: >
  Use when creating or changing the root vite.config.ts of a repository that uses @r_masseater/msch:
  repositoryConfig, workspaceSettings, the lint preset and its rule sets, extra root tasks, Betterleaks
  allowances and textlint words. Not for settings that apply to one workspace only.
metadata:
  type: core
  library: "@r_masseater/msch"
  library_version: 0.31.0
sources:
  - src/app/repository-config.ts
  - src/app/repository-tasks.ts
  - src/app/repository-text.ts
  - src/features/lint-preset/index.ts
  - src/features/workspace-settings/index.ts
---

# repository-config

The root `vite.config.ts` builds the whole configuration with `repositoryConfig` from `@r_masseater/msch/config`. It passes only what belongs to the repository. Everything shared by masseater's repositories comes from msch.

## Setup

1. Read the workspace settings, then spread `repositoryConfig` into `defineConfig`. Write `msch` beside it as a literal.

   ```ts
   import { repositoryConfig } from "@r_masseater/msch/config";
   import { decisionRules, tracedRules } from "@r_masseater/msch/lint";
   import { workspaceSettings } from "@r_masseater/msch/workspace-settings";
   import { defineConfig } from "vite-plus";

   const workspace = await workspaceSettings({
     root: import.meta.dirname,
     ruleSets: { decision: decisionRules, traced: tracedRules },
     dependencySets: {},
   });

   export default defineConfig({
     ...repositoryConfig({
       workspace,
       textlint: { kanji: ["個人情報保護法"] },
       run: { tasks: { "db-check-all": "vp run -r db:check" } },
     }),
     msch: { comments: { allow: [] } },
   });
   ```

2. Add `@r_masseater/msch/vite` to `types` in `tsconfig.json`. `defineConfig` then types `msch` and the vite-plus-adopt sections.

## What repositoryConfig returns

It returns `lint`, `fmt`, `staged`, `test`, `run` and the vite-plus-adopt sections: `commitlint`, `dependencyRules`, `betterleaks`, `steiger` and `textlint`.

- Steiger checks the `src` directory of every workspace.
- The `verify` task depends on every workspace's `verify` and on every root task. A task added to `run.tasks` is verified without listing it anywhere.
- The lint overrides already relax the rules for shadcn/ui components, public entries and deploy entries, and apply `decisionTestRules` to `*.test.ts`.

## Options

| Option      | Holds                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `workspace` | The result of `workspaceSettings`                                                                                           |
| `overrides` | Extra oxlint overrides for the repository                                                                                   |
| `secrets`   | `lines` and `paths` regular expressions that Betterleaks accepts as public                                                  |
| `textlint`  | `ignores`, `kanji` words allowed past the kanji run limit, `technicalWriting` and `rules` settings, `filters` and `sources` |
| `run`       | Extra root tasks as `{ name: command }`                                                                                     |

## Rule sets

`workspaceSettings` takes `ruleSets` and `dependencySets`. A workspace names them with `use`, so the values stay in the root.

- `decisionRules` cost a request per check. The preset leaves them off. Name them only for files that need them.
- `tracedRules` belong to Worker code that records spans with @r_masseater/workers-tracing.
- `remotionRules` belong to workspaces that build videos with Remotion.

## Common mistakes

- Writing a workspace path in the root config. The `root-workspace-path` check rejects it. Put the setting in that workspace's `msch` block instead, as [workspace-settings](../workspace-settings/SKILL.md) describes.
- Adding commitlint, textlint presets or `@ast-grep/cli` to the root `package.json`. msch already depends on them.
- Running effecttsgo rules on a plain oxlint. They need the oxlint that @effect/tsgo patches: run `effect-tsgo patch --typescript --oxlint` in `prepare`, or lint with `effect-tsgo vp check`.
