---
name: configure-checks
description: >
  Use when configuring or running the vpa CLI of @r_masseater/vite-plus-adopt in a Vite+ repository:
  the h56m, commitlint, textlint, steiger, fallow and dependencyRules sections of
  vite.config.ts, git hooks, the bundled Feature-Sliced Design Steiger plugin and the
  @arethetypeswrong/core replacement for pack.attw. Also use when a vpa check fails.
metadata:
  type: core
  library: "@r_masseater/vite-plus-adopt"
  library_version: 0.8.1
sources:
  - src/app/**
  - src/features/**
  - src/shared/config/types.ts
  - README.md
---

# configure-checks

`vpa` runs the checks that the sections of `vite.config.ts` configure.
They cover secrets with h56m.
They also run commitlint and textlint.
Steiger, fallow and the dependency rules check the code.
Run without arguments, it runs every configured check in parallel and prints the results together.

## Setup

1. Install it.

   ```sh
   vp add -D @r_masseater/vite-plus-adopt @r_masseater/h56m-presets
   ```

2. Write the sections. `import type {} from "@r_masseater/vite-plus-adopt"` types them in `defineConfig`.

   ```ts
   import { betterleaks } from "@r_masseater/h56m-presets";
   import type {} from "@r_masseater/vite-plus-adopt";
   import fsd from "@r_masseater/vite-plus-adopt/fsd";
   import { defineConfig } from "vite-plus";

   export default defineConfig({
     commitlint: { extends: ["@commitlint/config-conventional"] },
     dependencyRules: {
       banned: { "Tests import from vite-plus/test": ["vitest", "@vitest/*"] },
       peerRanges: "intersect",
     },
     h56m: { extend: { path: betterleaks } },
     steiger: { paths: ["apps/*/src"], rules: [...fsd.configs.recommended] },
     textlint: { ignores: ["CHANGELOG.md"], rules: { "preset-ja-technical-writing": true } },
     fallow: { production: true, rules: { "unused-files": "error" } },
     run: { tasks: { vpa: { command: "vpa", cache: false } } },
   });
   ```

3. Run `vpa` from git hooks.

   ```sh
   # .vite-hooks/pre-commit
   vpa --staged
   # .vite-hooks/commit-msg
   vpa --commit-msg "$1"
   ```

In a repository that uses @r_masseater/msch, `repositoryConfig` writes these sections and `msch` runs them. Change them through msch's options instead.

## Section notes

| Section      | Note                                                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `textlint`   | Checks the Markdown that git tracks. List other globs (`files`) and their settings in `textlint.sources`                                 |
| `steiger`    | Checks only the `steiger.paths` directories that hold FSD layer folders such as `features` directly                                      |
| `h56m`       | `filter` is an expression that accepts a finding. `ignoredSecrets` takes SHA-256 hashes of safe secrets. `h56m:allow` on a line skips it |
| `commitlint` | Compares against `VPA_BASE`, else `origin/HEAD`, `origin/main` or `origin/master`, else the whole history. Run with `cache: false`       |

## Bundled replacements

`@r_masseater/vite-plus-adopt/fsd` bundles @feature-sliced/steiger-plugin with the same rules and `configs.recommended`.
vpa does not use Steiger's CLI.
The plugin pulls in TypeScript 5.
Add `overrides: { "steiger>@feature-sliced/steiger-plugin": "-" }` to `pnpm-workspace.yaml` to drop it.

`@r_masseater/vite-plus-adopt/attw` has the API of @arethetypeswrong/core on TypeScript 7.1 alone.
Pass it as `pack.attw.module`.

```ts
import * as attw from "@r_masseater/vite-plus-adopt/attw";
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: { attw: { module: attw, profile: "esm-only", level: "error" } },
});
```
