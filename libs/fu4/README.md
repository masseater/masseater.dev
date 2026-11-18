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

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/fu4#<skill>`.
