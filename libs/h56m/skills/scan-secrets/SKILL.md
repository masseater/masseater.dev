---
name: scan-secrets
description: >
  Use when setting up @r_masseater/h56m in vite.config.ts, scanning commits, staged changes or
  text for leaked secrets, writing a custom secret rule or filter, or silencing a finding that is
  not a secret. Covers extending a preset, the Betterleaks-format settings, ignoredSecrets, h56m:allow, the CLI and
  makeDetector.
metadata:
  type: core
  library: "@r_masseater/h56m"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/shared/config/types.ts
---

# scan-secrets

h56m finds secrets with its own engine, which follows Betterleaks. It has no rules of its own, so extend a preset from
`@r_masseater/h56m-presets` or a TOML file of your own. It never sends a secret anywhere to check
whether it is live.

## Setup

```sh
vp add -D @r_masseater/h56m @r_masseater/h56m-presets
```

```ts
import "@r_masseater/h56m/vite";
import { betterleaks } from "@r_masseater/h56m-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  h56m: {
    extend: { path: betterleaks, disabledRules: ["generic-api-key"] },
    filter:
      'matchesAny(finding.line, [`EXAMPLE_KEY`]) || matchesAny(attributes["path"], [`^fixtures/`])',
    rules: [{ id: "my-token", regex: "\\b(my_[A-Za-z0-9]{20})\\b", keywords: ["my_"] }],
  },
});
```

The settings use the Betterleaks format. `extend.path` names the preset file and
`disabledRules` turns off rules of it. Without `extend`, only `rules` run. `extend.useDefault` is
rejected. `filter` on the top level or on a rule is an
Expr expression that drops a finding when it is true. It sees `finding` (`secret`, `line`, ...)
and `attributes["path"]`, and has `matchesAny`, `entropy` and the other Betterleaks helpers.

## CLI

`h56m` scans the commits after the first of the given revisions, or after `origin/HEAD`,
`origin/main` or `origin/master`, and scans the whole history when none resolves.
`h56m --staged` scans the index only. Each finding is printed as
`path:line:column rule description sha256:<digest> (commit)`, without the secret, and the exit code
is 1 when anything is found.

## Silencing a finding

Fix a real secret by removing it and rotating it. For a value that is not a secret, prefer these
in order:

- Add `h56m:allow` on the same line.
- Add the digest the CLI printed to `ignoredSecrets`.
- Match the line or the path in `filter`.

## From code

```ts
import { makeDetector } from "@r_masseater/h56m";

const program = Effect.gen(function* () {
  const detector = yield* makeDetector({ extend: { path: betterleaks } });
  const inText = yield* detector.scanText({ path: "chat.md", text });
  const staged = yield* detector.scanGit({ root, source: { type: "staged" } });
});
```

`scanGit` takes `{ type: "history", bases, head }`, which scans the commits after the first of `bases`
that names a commit, `{ type: "staged" }` or
`{ type: "snapshot", revision }`. A finding has `rule`, `confidence`, 1-based `line` and `column`
in UTF-16 code units, `secret`, its SHA-256 `digest`, and `commit` for history scans. Errors are
`H56mError`.
