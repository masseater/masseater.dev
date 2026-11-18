# @r_masseater/h56m

A secret scanner written in Rust and configured from `vite.config.ts`.

Its matching engine follows [Betterleaks](https://github.com/betterleaks/betterleaks)
and reads settings in the Betterleaks format, including filters, components and
decoding of base64, hex, percent and unicode text. It has no rules of its own: extend
a preset from [@r_masseater/h56m-presets](https://www.npmjs.com/package/@r_masseater/h56m-presets)
or a TOML file of your own. It scans the commits a branch adds, the staged changes, a
tree, or any text. It does not call the services the secrets belong to.

```ts
import "@r_masseater/h56m/vite";
import { betterleaks } from "@r_masseater/h56m-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  h56m: {
    extend: { path: betterleaks, disabledRules: ["generic-api-key"] },
    filter: 'matchesAny(attributes["path"], [`^fixtures/`])',
    rules: [{ id: "my-token", regex: "\\b(my_[A-Za-z0-9]{20})\\b", keywords: ["my_"] }],
  },
});
```

Run `h56m` to scan the commits since the default branch, or `h56m --staged`
to scan the index. Call `makeDetector` to scan text from code.

The engine ports code from Betterleaks, which is under MIT, and embeds its word list, which is under CC-BY-SA-4.0. `THIRD-PARTY-NOTICES.txt` holds their notices.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/h56m#<skill>`.
