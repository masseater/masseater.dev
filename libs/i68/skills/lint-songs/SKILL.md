---
name: lint-songs
description: >
  Use when setting up @r_masseater/i68 in vite.config.ts, running it on .fumx songs, writing a
  music rule in TypeScript with defineRule, or silencing a finding with an i68-ignore comment.
metadata:
  type: core
  library: "@r_masseater/i68"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/shared/config/types.ts
  - src/features/run-rules/model/suppressions.ts
---

# lint-songs

i68 lints `.fumx` songs. Each rule sees the song as data and reports findings by file line and column.

## Setup

```ts
import "@r_masseater/i68/vite";
import { recommended } from "@r_masseater/i68-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({ i68: { extends: [recommended()] } });
```

Run `vp exec i68`. It lints every `.fumx` file git tracks, or the paths given. It exits non-zero only when a rule set to `"error"` reports.

## Config

| Key       | Holds                                                                     |
| --------- | ------------------------------------------------------------------------- |
| `extends` | Configs applied first; later entries and the config's own keys win        |
| `plugins` | `{ name: plugin }`; a plugin's rules become `name/rule` and run as errors |
| `rules`   | `"off"`, `"warn"`, `"error"` or `[severity, options]` per `plugin/rule`   |
| `ignores` | Globs of files to skip                                                    |

Naming a plugin in `rules` that `plugins` does not register fails the run.

## Write a rule

`check(context)` gets `song` (the parsed `Song`), `soundings` (notes of unmuted tracks with `track`, `role`, `midi`, `start`, `end`, `bar`, `line`, `column`), `options` and `report({ line, column, message, detail })`. Times are ticks. `end` already accounts for the note's gate. Keys and chords come from `@r_masseater/fumx-parser/analysis`.

Report with the sounding's `line` and `column` so the finding points at the note in the file.

## Ignore a finding

`// i68-ignore rule-a, rule-b` on the line, `// i68-ignore-next-line` on the line above, or `// i68-ignore-file` anywhere. Without rule names it ignores every rule.
