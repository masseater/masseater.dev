---
name: apply-presets
description: >
  Use when choosing which @r_masseater/fu4-presets presets a repository's fu4 config extends,
  setting their options, or fixing what their actionlint/ and zizmor/ rules report on GitHub
  Actions workflows, actions, Dependabot and pre-commit configs.
metadata:
  type: core
  library: "@r_masseater/fu4-presets"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/app/presets.ts
---

# apply-presets

Each preset returns a fu4 config that loads one plugin and turns its rules on as errors. A config
lists the presets it wants in `extends`; its own `rules` and `overrides` come after them and win.

## Setup

```ts
import "@r_masseater/fu4/vite";
import { actionlint, zizmor } from "@r_masseater/fu4-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fu4: {
    extends: [
      actionlint({
        "self-hosted-runner": { labels: ["gpu"] },
        "config-variables": ["DEPLOY_TARGET"],
      }),
      zizmor({ concerns: ["injection", "supply-chain"], persona: "regular", minSeverity: "low" }),
    ],
  },
});
```

## Presets

- `actionlint(options)` turns on `actionlint/*`: what actionlint reports, with the same messages
  and positions, and its shellcheck checks of `run:` scripts. It takes the options of
  actionlint's `actionlint.yaml`: `self-hosted-runner.labels` and `config-variables`. Leave
  `config-variables` out to accept any `vars.*` name; an empty list rejects every name.
- `zizmor(options)` turns on `zizmor/*`: zizmor's audits with its findings and positions.
  `concerns` picks `injection`, `supply-chain`, `references`, `credentials`, `workflow` and
  `config`; all by default. `persona`, `minSeverity` and `minConfidence` work as in zizmor.
  `rules` is the `rules` section of a zizmor config. `online: false` skips the audits that query
  GitHub, and `githubHost` points them at GitHub Enterprise Server.
- `recommended()` extends both with their defaults.

The audits that query GitHub read a token from `ZIZMOR_GITHUB_TOKEN`, `GH_TOKEN` or
`GITHUB_TOKEN` and are skipped without one.

## Fixing reports

The rule name in brackets names the tool it comes from. A zizmor message ends with a link to
zizmor's documentation for that audit; for an `actionlint/` rule, read actionlint's
documentation for the check. Fix the workflow first. A `# zizmor: ignore[audit]` comment on the
line silences one zizmor finding. Turn a rule off in `overrides` only for files you have decided
to accept, and keep the globs narrow.
