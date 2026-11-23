# @r_masseater/fu4

<img src="logo.svg" alt="fu4 logo" width="256">

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

Measured on 2026-11-19 on linux x64, 4 CPUs with [lint-bench](https://github.com/masseater/masseater.dev/tree/main/tools/lint-bench), which keeps the full results in [results.md](https://github.com/masseater/masseater.dev/blob/main/tools/lint-bench/results/results.md). Cold runs drop the page cache and the tools' caches first. "Same as ours", "Only ours" and "Only theirs" compare findings by file, line and rule where both tools use the same rules.

On the same files in nodejs/node, fu4 reports 74 of the 86 findings of actionlint and zizmor together and none of its own. The other 12 are actionlint 1.7.12 errors on `$/` paths in `uses:`, GitHub's syntax for an action or reusable workflow in the same repository, which actionlint does not accept yet. fu4 is slower, mostly in starting Node and loading the presets.

### masseater.dev

| Tool                | Version                              | Cold    | Warm             | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ------------------- | ------------------------------------ | ------- | ---------------- | -------- | -------- | ------------ | --------- | ----------- |
| ghalint             | 1.6.0                                | 84 ms   | 32 ms ± 4 ms     | 16 MB    | 35       |              |           |             |
| actionlint          | 1.7.12                               | 110 ms  | 71 ms ± 3 ms     | 23 MB    | 0        |              |           |             |
| zizmor              | 1.32.0                               | 140 ms  | 105 ms ± 16 ms   | 31 MB    | 0        |              |           |             |
| actionlint + zizmor | 1.7.12 + 1.32.0                      | 238 ms  | 170 ms ± 9 ms    | 31 MB    | 0        | 0            | 0         | 0           |
| poutine             | 1.1.6                                | 672 ms  | 429 ms ± 14 ms   | 55 MB    | 39       |              |           |             |
| **fu4**             | workspace, fu4-presets recommended() | 1.75 s  | 1.50 s ± 41 ms   | 463 MB   | 0        |              |           |             |
| sisakulint          | 0.3.8                                | 10.11 s | 10.14 s ± 370 ms | 51 MB    | 46       |              |           |             |

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
| ghalint             | 1.6.0                                | 202 ms | 97 ms ± 5 ms    | 18 MB    | 92       |              |           |             |
| zizmor              | 1.32.0                               | 240 ms | 188 ms ± 15 ms  | 35 MB    | 18       |              |           |             |
| actionlint          | 1.7.12                               | 374 ms | 347 ms ± 11 ms  | 28 MB    | 68       |              |           |             |
| actionlint + zizmor | 1.7.12 + 1.32.0                      | 609 ms | 544 ms ± 6 ms   | 36 MB    | 86       | 74           | 0         | 12          |
| poutine             | 1.1.6                                | 1.22 s | 778 ms ± 17 ms  | 55 MB    | 43       |              |           |             |
| **fu4**             | workspace, fu4-presets recommended() | 3.12 s | 2.66 s ± 101 ms | 546 MB   | 74       |              |           |             |
| sisakulint          | 0.3.8                                | 8.16 s | 8.25 s ± 732 ms | 30 MB    | 31       |              |           |             |

- fu4: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint + zizmor: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint: Workflows only, with shellcheck
- zizmor: Workflows, action.yml files and the Dependabot config, offline, regular persona
- poutine: Workflows and actions, default rules
- ghalint: Workflows and actions, default policies
- sisakulint: Workflows, default rules

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/fu4#<skill>`.
