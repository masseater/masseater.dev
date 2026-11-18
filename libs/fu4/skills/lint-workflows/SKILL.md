---
name: lint-workflows
description: >
  Use when setting up @r_masseater/fu4 in vite.config.ts, running it on GitHub Actions
  workflows, actions, Dependabot or pre-commit configs, or writing a rule or plugin for it.
  Covers extends, rules, settings, overrides, ignores, the CLI and the rule API.
metadata:
  type: core
  library: "@r_masseater/fu4"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/shared/config/types.ts
---

# lint-workflows

fu4 is the engine of a GitHub Actions linter. Rust parses each file once; TypeScript rules read
the parsed trees without copying them. fu4 has no rules of its own, so a config without plugins
reports nothing. The official rules are in `@r_masseater/fu4-presets`, which ships its own skill for choosing
them and fixing what they report.

## Setup

```sh
vp add -D @r_masseater/fu4 @r_masseater/fu4-presets
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

- `extends` lists configs to start from. The config's own keys come after them and win.
- `rules` sets a rule to `"error"`, `"warn"` or `"off"`, or to `[severity, options]`.
- `settings` holds values every rule can read, keyed by plugin name.
- `overrides` gives `files` globs their own `rules`.
- `ignores` lists globs of files the CLI does not lint.

## Running

Run `fu4` in the repository root. It lints the workflows git tracks or would add under
`.github/workflows`, the `action.yml` files, `.github/dependabot.yml` and the pre-commit configs at
the root, prints `path:line:column: message [rule]`, and exits with 1 when it reports anything.
Pass pathspecs to lint other files: `fu4 'ci/**/*.yml'`. From code, `lint({ root, files, config })`
returns the diagnostics as an Effect.

## Writing rules

Define a rule with `defineRule({ meta, check })` and register it in a plugin with
`definePlugin({ rules })`. Put the plugin under `plugins` and turn its rules on in `rules`.

- `meta.kinds` lists the inputs the rule reads: `workflow` (the default), `action`, `dependabot`
  or `pre-commit`.
- `check(context)` reads `context.source` (the YAML tree, the tree-sitter tree and the lines),
  `context.options`, `context.settings` and `context.project`, which reads other files of the
  repository. It may return an Effect.
- `context.parseScript(language, text)` parses a `run:` script as `bash` or `powershell`.
- `context.report({ message, line, column })` reports a finding.
