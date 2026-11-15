---
name: msch-checks
description: >
  Use in a repository that depends on @r_masseater/msch: before changing code, config, workflows,
  skills or docs there, and whenever msch or its lint preset reports a finding. msch holds
  masseater's repository conventions as checks, so its findings stand in for a written rule list.
metadata:
  type: core
  library: "@r_masseater/msch"
  library_version: 0.18.0
sources:
  - src/app/cli.ts
  - README.md
---

# msch-checks

msch holds masseater's repository conventions as checks. No list of those conventions is kept anywhere else, this skill included. Run msch to learn what a repository expects.

Run `vp exec msch` at the repository root. It takes no subcommand and checks the whole repository, and `--json` prints the findings as JSON. The lint preset `@r_masseater/msch/lint` reports the rest through `vp lint`.

Each finding names the file, the rule and the fix. Apply the fix the message gives. Never silence a finding with an ignore list, a disable directive or an override. When a finding is wrong, fix the check in msch.
