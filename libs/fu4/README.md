# @r_masseater/fu4

![fu4 logo](logo.svg)

The engine of a GitHub Actions linter, configured from `vite.config.ts`.

fu4 parses workflows, `action.yml` files, the Dependabot config and pre-commit configs in Rust,
hands the YAML and tree-sitter trees to TypeScript rules without copying them, and runs those
rules. It ships no rules of its own. Take the official ones from
[`@r_masseater/fu4-presets`](https://www.npmjs.com/package/@r_masseater/fu4-presets): actionlint's
checks and zizmor's audits.

```sh
npm install -D @r_masseater/fu4 @r_masseater/fu4-presets effect
```

```ts
import "@r_masseater/fu4/vite";
import { recommended } from "@r_masseater/fu4-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fu4: {
    extends: [recommended()],
    rules: { "zizmor/stale-action-refs": "warn" },
    overrides: [
      { files: [".github/workflows/vendored-*.yml"], rules: { "actionlint/shellcheck": "off" } },
    ],
    ignores: [".github/workflows/generated-*.yml"],
  },
});
```

| Key         | Meaning                                                               |
| ----------- | --------------------------------------------------------------------- |
| `extends`   | Configs to start from; this config's own keys come after them and win |
| `plugins`   | Rule plugins by name; a rule is then `<plugin>/<rule>`                |
| `rules`     | `"error"`, `"warn"` or `"off"` per rule, or `[severity, options]`     |
| `settings`  | Settings every rule can read, keyed by plugin                         |
| `overrides` | `files` globs with their own `rules`                                  |
| `ignores`   | Globs of files the CLI does not lint                                  |

Run `fu4` in the repository root. It lints the workflows under `.github/workflows`, the
`action.yml` files, `.github/dependabot.yml` and the pre-commit configs at the root, prints
`path:line:column: message [rule]`, and exits with 1 when it reports anything. Pass pathspecs to
lint other files. From code, `lint({ root, files, config })` returns the diagnostics as an Effect.

Write your own rules with `defineRule` and group them with `definePlugin`. A rule receives the
parsed source, can parse a `run:` script with `parseScript`, and reports positions with
`report`.

## Comparison

Measured on 2026-11-18 on linux x64, 4 CPUs with [lint-bench](https://github.com/masseater/masseater.dev/tree/main/tools/lint-bench), which keeps the full results in [results.md](https://github.com/masseater/masseater.dev/blob/main/tools/lint-bench/results/results.md). Cold runs drop the page cache and the tools' caches first. "Same as ours", "Only ours" and "Only theirs" compare findings by file, line and rule where both tools use the same rules.

On the same files in nodejs/node, fu4 reports 63 of the 86 findings of actionlint and zizmor together, misses 23 and adds 1. It is slower, mostly in starting Node and loading the presets.

### masseater.dev

| Tool                | Version                              | Cold    | Warm             | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ------------------- | ------------------------------------ | ------- | ---------------- | -------- | -------- | ------------ | --------- | ----------- |
| ghalint             | 1.6.0                                | 73 ms   | 28 ms ± 4 ms     | 14 MB    | 35       |              |           |             |
| actionlint          | 1.7.12                               | 105 ms  | 68 ms ± 3 ms     | 25 MB    | 0        |              |           |             |
| zizmor              | 1.32.0                               | 151 ms  | 100 ms ± 16 ms   | 32 MB    | 0        |              |           |             |
| actionlint + zizmor | 1.7.12 + 1.32.0                      | 227 ms  | 172 ms ± 20 ms   | 31 MB    | 0        | 0            | 0         | 0           |
| poutine             | 1.1.6                                | 584 ms  | 387 ms ± 27 ms   | 54 MB    | 39       |              |           |             |
| **fu4**             | workspace, fu4-presets recommended() | 1.76 s  | 1.49 s ± 79 ms   | 465 MB   | 0        |              |           |             |
| sisakulint          | 0.3.8                                | 10.74 s | 11.19 s ± 375 ms | 22 MB    | 46       |              |           |             |

- fu4: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint + zizmor: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint: Workflows only, with shellcheck
- zizmor: Workflows, action.yml files and the Dependabot config, offline, regular persona
- poutine: Workflows and actions, default rules
- ghalint: Workflows and actions, default policies
- sisakulint: Workflows, default rules

### nodejs/node

| Tool                | Version                              | Cold   | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ------------------- | ------------------------------------ | ------ | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| ghalint             | 1.6.0                                | 271 ms | 139 ms ± 17 ms  | 18 MB    | 92       |              |           |             |
| zizmor              | 1.32.0                               | 223 ms | 177 ms ± 20 ms  | 36 MB    | 18       |              |           |             |
| actionlint          | 1.7.12                               | 358 ms | 321 ms ± 13 ms  | 29 MB    | 68       |              |           |             |
| actionlint + zizmor | 1.7.12 + 1.32.0                      | 553 ms | 498 ms ± 19 ms  | 36 MB    | 86       | 63           | 1         | 23          |
| poutine             | 1.1.6                                | 1.56 s | 732 ms ± 50 ms  | 54 MB    | 43       |              |           |             |
| **fu4**             | workspace, fu4-presets recommended() | 2.76 s | 2.44 s ± 110 ms | 541 MB   | 64       |              |           |             |
| sisakulint          | 0.3.8                                | 8.82 s | 8.55 s ± 863 ms | 30 MB    | 31       |              |           |             |

- fu4: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint + zizmor: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint: Workflows only, with shellcheck
- zizmor: Workflows, action.yml files and the Dependabot config, offline, regular persona
- poutine: Workflows and actions, default rules
- ghalint: Workflows and actions, default policies
- sisakulint: Workflows, default rules

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/fu4#<skill>`.
