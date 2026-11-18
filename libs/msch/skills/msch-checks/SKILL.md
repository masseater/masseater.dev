---
name: msch-checks
description: >
  Use in a repository that depends on @r_masseater/msch: before changing code, config, workflows,
  skills or docs there, and whenever msch, its lint preset or a git hook reports a finding. msch holds
  masseater's repository conventions as checks, so its findings stand in for a written rule list.
metadata:
  type: core
  library: "@r_masseater/msch"
  library_version: 0.32.0
sources:
  - bin/msch.ts
  - src/app/**
  - bin/msch-exits.ts
---

# msch-checks

msch holds masseater's repository conventions as checks. No list of those conventions is kept anywhere else, this skill included. Run msch to learn what a repository expects.

## Run the checks

Run `vp exec msch` at the repository root. It takes no subcommand, checks the whole repository and exits with 1 when it finds anything. `--json` prints the findings as JSON.

msch also runs every vite-plus-adopt check that the root `vite.config.ts` configures.
Those include h56m, commitlint and textlint.
Steiger, the dependency rules and fallow run as well.
They read `VPA_BASE` (default `origin/main`) and other environment variables.
A task that runs msch therefore sets `cache: false`.

The lint preset `@r_masseater/msch/lint` reports the rest through `vp lint`, including the `msch-lint/*` rules.

## Upstream exits

Every overrides, patchedDependencies and packageExtensions entry in the root `pnpm-workspace.yaml` and every `[patch]` entry in the root `Cargo.toml` ends its line with `# exit: <condition>`. msch reports an entry without a condition it can check, and a deviation written anywhere else.

Run `vp exec msch-exits` at the repository root to look the conditions up on npm, crates.io and GitHub. It exits with 1 when a condition is met or could not be checked, and `--json` prints the results as JSON. The root `daily` task runs it.

For a met condition, remove the entry and its patch file and run verify. If verify still needs the deviation, keep it and replace the condition with the next event that could end it.

## Git hooks

| Hook       | Command                  |
| ---------- | ------------------------ |
| pre-commit | `msch --staged`          |
| commit-msg | `msch --commit-msg "$1"` |

## Act on a finding

Each finding names the file, the rule and the fix. Apply the fix the message gives.

Never silence a finding with an ignore list, a disable directive or an override. When a finding is wrong, fix the check in msch.
