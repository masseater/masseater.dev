---
name: msch-checks
description: >
  Use in a repository that depends on @r_masseater/msch: before changing code, config, workflows,
  skills or docs there, and whenever msch, its lint preset or a git hook reports a finding. msch holds
  masseater's repository conventions as checks, so its findings stand in for a written rule list.
metadata:
  type: core
  library: "@r_masseater/msch"
  library_version: 0.31.0
sources:
  - bin/msch.ts
  - src/app/**
---

# msch-checks

msch holds masseater's repository conventions as checks. No list of those conventions is kept anywhere else, this skill included. Run msch to learn what a repository expects.

## Run the checks

Run `vp exec msch` at the repository root. It takes no subcommand, checks the whole repository and exits with 1 when it finds anything. `--json` prints the findings as JSON.

msch also runs every vite-plus-adopt check that the root `vite.config.ts` configures: Betterleaks, commitlint, textlint, Steiger, dependency rules and fallow. Those checks read `VPA_BASE` (default `origin/main`) and other environment variables, so a task that runs msch sets `cache: false`.

The lint preset `@r_masseater/msch/lint` reports the rest through `vp lint`, including the `msch-lint/*` rules.

## Git hooks

- pre-commit: `msch --staged`
- commit-msg: `msch --commit-msg "$1"`

## Act on a finding

Each finding names the file, the rule and the fix. Apply the fix the message gives.

Never silence a finding with an ignore list, a disable directive or an override. When a finding is wrong, fix the check in msch.

## Related skills

- [repository-config](../repository-config/SKILL.md) builds the root `vite.config.ts` that configures these checks.
- [workspace-settings](../workspace-settings/SKILL.md) covers what one workspace may change.
