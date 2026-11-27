---
name: repository-config
description: >
  Use when creating or changing the root vite.config.ts of a repository that uses @r_masseater/msch:
  repositoryConfig, workspaceSettings, the lint preset and its rule sets, extra root tasks, h56m
  allowances and textlint words. Not for settings that apply to one workspace only.
metadata:
  type: core
  library: "@r_masseater/msch"
  library_version: 0.31.0
sources:
  - src/app/repository-config.ts
  - src/app/repository-tasks.ts
  - src/app/repository-text.ts
  - src/features/define-lint-preset/index.ts
  - src/features/build-workspace-settings/index.ts
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

It returns `lint`, `fmt`, `staged`, `test` and `run`.
It also returns the vite-plus-adopt sections `commitlint`, `dependencyRules`, `h56m` and `textlint`.
The `wism` section declares the layout of workspaces, crates and skills.

wism checks the layout and imports of every member workspace, Rust crate and skill.
The `verify` task depends on every workspace's `verify` and on every root task.
A task added to `run.tasks` is therefore verified without listing it anywhere.
The root `check` and `test` tasks run through `msch-changed`.
It passes them only the workspaces whose files, dependencies or installed packages changed since the last pass.
The `check` task passes `--batch-sources 1000` and runs the command once per batch of at most 1000 source files.
The peak memory of the type-aware lint then follows the largest batch, not the size of the repository.
A batch that passes is recorded on its own, so a later run repeats only the batches that failed.
It records passes under `node_modules/.cache/msch/changed`; delete that directory to check everything again.
`msch` checks the pnpm overrides again only when a file that pnpm resolves from changed since they last passed.
It records that pass under `node_modules/.cache/msch/overrides`; delete that directory to check them again.
The lint overrides already relax the rules for shadcn/ui components, public entries and deploy entries.
They also apply `decisionTestRules` to `*.test.ts`.

## Options

| Option      | Holds                                                                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workspace` | The result of `workspaceSettings`                                                                                                                                                                                                                                  |
| `overrides` | Extra oxlint overrides for the repository                                                                                                                                                                                                                          |
| `secrets`   | `lines` and `paths` regular expressions that h56m accepts as public                                                                                                                                                                                                |
| `textlint`  | `ignores`, `kanji` words allowed past the kanji run limit, `technicalWriting` and `rules` settings, `filters` and `sources`                                                                                                                                        |
| `run`       | `tasks`, extra root tasks as `{ name: command }`; `remoteCache`, the URL of the remote task cache that every `vp run` reads; and `check`, `{ launcher, dependsOn }` to run `vp check` through another command than `effect-tsgo --tsrs-lint` after the named tasks |

## Rule sets

`workspaceSettings` takes `ruleSets` and `dependencySets`. A workspace names them with `use`, so the values stay in the root.

| Rule set        | Use                                                                                    |
| --------------- | -------------------------------------------------------------------------------------- |
| `decisionRules` | Each check costs a request, so the preset leaves them off. Name them only where needed |
| `tracedRules`   | Worker code that records spans with @r_masseater/workers-tracing                       |
| `remotionRules` | Workspaces that build videos with Remotion                                             |

## Common mistakes

| Mistake                                                                           | Fix                                                                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Writing a workspace path in the root config                                       | The `root-workspace-path` check rejects it. Use the workspace's `msch` block                    |
| Adding commitlint, textlint presets or `@ast-grep/cli` to the root `package.json` | msch already depends on them                                                                    |
| Running effecttsgo rules on a plain oxlint                                        | Run `effect-tsgo patch --typescript --oxlint` in `prepare`, or lint with `effect-tsgo vp check` |
