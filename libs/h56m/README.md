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

## Comparison

Measured on 2026-11-18 on linux x64, 4 CPUs with [lint-bench](https://github.com/masseater/masseater.dev/tree/main/tools/lint-bench), which keeps the full results in [results.md](https://github.com/masseater/masseater.dev/blob/main/tools/lint-bench/results/results.md). Cold runs drop the page cache and the tools' caches first. "Same as ours", "Only ours" and "Only theirs" compare findings by file, line and rule where both tools use the same rules.

h56m uses the Betterleaks rules, but reports findings that Betterleaks drops: low-confidence `generic-password` and `generic-api-key` matches in test fixtures. This is a difference to fix in h56m, not an intended one.

### masseater.dev

| Tool        | Version                             | Cold   | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------- | ----------------------------------- | ------ | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| Kingfisher  | 2.19.1                              | 8.05 s | 714 ms ± 27 ms  | 157 MB   | 0        |              |           |             |
| gitleaks    | 8.30.1                              | 864 ms | 784 ms ± 28 ms  | 72 MB    | 0        |              |           |             |
| **h56m**    | workspace, h56m-presets betterleaks | 985 ms | 803 ms ± 37 ms  | 280 MB   | 5        |              |           |             |
| Betterleaks | 2.0.0-rc.9                          | 1.58 s | 1.62 s ± 70 ms  | 118 MB   | 0        | 0            | 5         | 0           |
| TruffleHog  | 3.99.9                              | 5.76 s | 8.48 s ± 657 ms | 185 MB   | 0        |              |           |             |

- h56m: Commits from the base to HEAD, Betterleaks default rules, no live validation
- Betterleaks: Commits from the base to HEAD, Betterleaks default rules, no live validation
- gitleaks: Commits from the base to HEAD, gitleaks default rules
- TruffleHog: Commits from the base to HEAD, all detectors, --no-verification
- Kingfisher: Commits from the base to HEAD, default rules, --no-validate

### nodejs/node

| Tool        | Version                             | Cold    | Warm             | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------- | ----------------------------------- | ------- | ---------------- | -------- | -------- | ------------ | --------- | ----------- |
| Betterleaks | 2.0.0-rc.9                          | 689 ms  | 646 ms ± 51 ms   | 370 MB   | 0        | 0            | 11        | 0           |
| gitleaks    | 8.30.1                              | 1.23 s  | 1.10 s ± 71 ms   | 71 MB    | 3        |              |           |             |
| Kingfisher  | 2.19.1                              | 8.49 s  | 1.21 s ± 64 ms   | 231 MB   | 0        |              |           |             |
| **h56m**    | workspace, h56m-presets betterleaks | 2.58 s  | 2.29 s ± 94 ms   | 340 MB   | 11       |              |           |             |
| TruffleHog  | 3.99.9                              | 16.40 s | 30.30 s ± 2.40 s | 185 MB   | 0        |              |           |             |

- h56m: Commits from the base to HEAD, Betterleaks default rules, no live validation
- Betterleaks: Commits from the base to HEAD, Betterleaks default rules, no live validation
- gitleaks: Commits from the base to HEAD, gitleaks default rules
- TruffleHog: Commits from the base to HEAD, all detectors, --no-verification
- Kingfisher: Commits from the base to HEAD, default rules, --no-validate

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/h56m#<skill>`.
