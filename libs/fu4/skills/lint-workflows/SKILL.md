---
name: lint-workflows
description: >
  Use when setting up @r_masseater/fu4 in vite.config.ts, running it on GitHub Actions
  workflows, actions or Dependabot configs, or fixing what it reports. Covers self-hosted
  runner labels, configuration variables, per-path ignores, excluded workflows, zizmor's
  security audits, and the CLI.
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
with the same messages and positions, except for actionlint's pyflakes check. It checks `run:`
scripts with its own subset of shellcheck's checks, so shellcheck does not need to be installed.
It also runs zizmor's security audits on workflows, `action.yml` files, the Dependabot config
and pre-commit configs, so zizmor does not need to be installed either.

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
    audit: {
      persona: "regular",
      minSeverity: "low",
      rules: { "template-injection": { disable: true } },
    },
  },
});
```

- `selfHostedRunner.labels` lists the labels of your own runners, so `runs-on` accepts them.
- `configVariables` lists the names `vars.*` may use. Leave it out to accept any name; an
  empty list rejects every name.
- `paths` maps a glob of workflow paths to regular expressions. A diagnostic in a matching
  workflow is dropped when its message matches one of them.
- `ignores` lists globs of workflows the CLI does not lint.
- `audit.rules` is the `rules` section of a zizmor config: `disable`, `ignore`,
  `severity` and each audit's `config`.
- `audit.persona` is `regular` (the default), `pedantic` or `auditor`; the latter two add
  findings zizmor hides by default. `audit.minSeverity` and `audit.minConfidence` drop findings
  below a level.
- Audits that query GitHub (impostor commits, ref confusion, known vulnerable actions and
  others) run when `GH_TOKEN` is set. `audit.online: false` skips them, and `audit.githubHost`
  points them at GitHub Enterprise.

## Running

Run `fu4` in the repository root. It lints the workflows git tracks or would add under
`.github/workflows`, prints `path:line:column: message [rule]`, and exits with 1 when it reports
anything. It also audits `action.yml` files anywhere in the repository, `.github/dependabot.yml`
and the pre-commit configs at the root. Pass pathspecs to lint other files:
`fu4 'ci/**/*.yml'`.

From code, `lint({ root, files, config })` returns the diagnostics as an Effect.

## Fixing reports

The rule name in brackets is actionlint's or zizmor's. An audit's message ends with a link to
zizmor's documentation for it; for other rules, read actionlint's documentation for that
check to see why it fires. A zizmor `# zizmor: ignore[rule]` comment on the line also works. Fix the workflow; use `paths` only for a finding you have decided to accept,
and keep the regular expression narrow.
