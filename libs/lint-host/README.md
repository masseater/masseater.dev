# @masseater.dev/lint-host

Runs a linter written in Rust from Node.js.

It builds the napi addon with cargo and loads it for the current platform, reads the linter's
section of `vite.config.ts` and the files git tracks, resolves rule settings such as
`"warn"` or `["error", { ... }]`, and passes the current trace to the addon.

```ts
import { callAddon, loadAddon, runCli } from "@masseater.dev/lint-host";

const addon = loadAddon({
  packageName: "@scope/my-linter",
  binary: "my-linter",
  from: import.meta.url,
  isAddon: (value): value is MyAddon => typeof value === "object" && value !== null,
  failWith: (message) => (cause) => new Error(`${message}: ${String(cause)}`),
});
```

`buildAddon` builds the addon from `bin/build-native.ts`, and `addonTasks` from
`@masseater.dev/lint-host/vite` declares the `native`, `build` and `test` tasks around it.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @masseater.dev/lint-host#<skill>`.
