---
name: lint-workflows
description: >
  Use when setting up @r_masseater/fu4 in vite.config.ts, running it on GitHub Actions
  workflows, or fixing what it reports. Covers self-hosted runner labels, configuration
  variables, per-path ignores, excluded workflows, and the CLI.
metadata:
  type: core
  library: "@r_masseater/fu4"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/shared/config/types.ts
---

# lint-workflows

fu4 is a GitHub Actions workflow linter written in Rust. It reports what actionlint reports,
with the same messages and positions, except for actionlint's shellcheck and pyflakes checks.

## Setup

```sh
vp add -D @r_masseater/fu4
```

```ts
import "@r_masseater/fu4/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fu4: {
    selfHostedRunner: { labels: ["gpu"] },
    configVariables: ["DEPLOY_TARGET"],
    paths: {
      ".github/workflows/release.yml": { ignore: ['^input "token" is not defined'] },
    },
    ignores: [".github/workflows/vendored-*.yml"],
  },
});
```

- `selfHostedRunner.labels` lists the labels of your own runners, so `runs-on` accepts them.
- `configVariables` lists the names `vars.*` may use. Leave it out to accept any name; an
  empty list rejects every name.
- `paths` maps a glob of workflow paths to regular expressions. A diagnostic in a matching
  workflow is dropped when its message matches one of them.
- `ignores` lists globs of workflows the CLI does not lint.

## Running

Run `fu4` in the repository root. It lints the workflows git tracks or would add under
`.github/workflows`, prints `path:line:column: message [rule]`, and exits with 1 when it reports
anything. Pass pathspecs to lint other files: `fu4 'ci/**/*.yml'`.

From code, `lint({ root, files, config })` returns the diagnostics as an Effect.

## Fixing reports

The rule name in brackets is actionlint's. Read actionlint's documentation for that check to
see why it fires. Fix the workflow; use `paths` only for a finding you have decided to accept,
and keep the regular expression narrow.
