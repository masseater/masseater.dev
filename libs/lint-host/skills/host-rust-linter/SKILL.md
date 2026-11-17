---
name: host-rust-linter
description: >
  Use when wiring a linter written in Rust into Node.js with @r_masseater/lint-host: building and
  loading its napi addon, declaring its vite-plus tasks, writing its CLI over a vite.config.ts
  section, or resolving rule settings.
metadata:
  type: core
  library: "@r_masseater/lint-host"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/app/vite.ts
---

# host-rust-linter

lint-host holds what every Rust linter needs on the Node.js side, so the linter package keeps
only its rules, diagnostics and config.

## Addon

Put the napi crate in the cargo workspace and build it from `bin/build-native.ts`:

```ts
import { buildAddon } from "@r_masseater/lint-host";

buildAddon({
  crate: "my-linter-node",
  binary: "my-linter",
  packageDir: `${import.meta.dirname}/..`,
  workspaceDir: `${import.meta.dirname}/../../..`,
});
```

It copies the library to `native/<binary>.<platform>.node`. Declare the tasks with
`...addonTasks({ command: "node bin/build-native.ts", inputs })` from `@r_masseater/lint-host/vite`; tests and the pack depend on
`native`. Pass `buildAfter` to run other tasks before the pack.

Load the addon with `loadAddon`. It tries `<packageName>-<platform>` first, then the file under
`native/`. Call it with `callAddon`, which wraps the call in a `<name>.native` span and flushes the
addon's telemetry afterwards, so the addon must export `flushTelemetry`.

## CLI

`runCli` reads the first `vite.config.*`, picks the linter's section with `section`, lists the
tracked files that `pathspecs` selects, runs `lint` and prints each finding with `format`. It exits
with 1 when a finding has the severity `error`, and exports spans over OTLP when
`OTEL_EXPORTER_OTLP_ENDPOINT` is set.

A tool that does not lint tracked files uses `runTool` instead. Its `scan` gets the repository root,
the section and the command-line arguments, and the CLI exits with 1 when `scan` finds anything.

## Rule settings

`settingOf` turns a rule entry (`"off"`, `"warn"`, `"error"` or a tuple with options) into a
severity and options. `traceparent` gives the current span for the addon, and `sortByPosition`
orders findings by path and line.
