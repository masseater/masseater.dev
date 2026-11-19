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

Encoded text is decoded up to five times, as the Betterleaks CLI does. Set
`maxDecodeDepth` to change that; `0` scans only the text as written.

The tests run every scan that the Betterleaks test suite makes and compare the
findings; `src/app/fixtures/` holds them.

The engine ports code from Betterleaks, which is under MIT, and embeds its word list, which is under CC-BY-SA-4.0. `THIRD-PARTY-NOTICES.txt` holds their notices.

## Comparison

Measured on 2026-11-19 on linux x64, 4 CPUs with [lint-bench](https://github.com/masseater/masseater.dev/tree/main/tools/lint-bench), which keeps the full results in [results.md](https://github.com/masseater/masseater.dev/blob/main/tools/lint-bench/results/results.md). Cold runs drop the page cache and the tools' caches first. "Same as ours", "Only ours" and "Only theirs" compare findings by file, line and rule where both tools use the same rules.

h56m uses the Betterleaks rules and, like Betterleaks, scans only the lines each commit adds. Its findings match Betterleaks on both repositories. It runs 2 to 3 times slower than Betterleaks.

### masseater.dev

| Tool        | Version                             | Cold   | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------- | ----------------------------------- | ------ | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| Betterleaks | 2.0.0-rc.9                          | 369 ms | 328 ms ± 29 ms  | 82 MB    | 1        | 1            | 0         | 0           |
| gitleaks    | 8.30.1                              | 805 ms | 652 ms ± 25 ms  | 63 MB    | 1        |              |           |             |
| **h56m**    | workspace, h56m-presets betterleaks | 1.03 s | 740 ms ± 19 ms  | 254 MB   | 1        |              |           |             |
| Kingfisher  | 2.19.1                              | 9.10 s | 740 ms ± 20 ms  | 178 MB   | 0        |              |           |             |
| TruffleHog  | 3.99.9                              | 5.96 s | 9.89 s ± 477 ms | 185 MB   | 0        |              |           |             |

- h56m: Commits from the base to HEAD, Betterleaks default rules, no live validation
- Betterleaks: Commits from the base to HEAD, Betterleaks default rules, no live validation
- gitleaks: Commits from the base to HEAD, gitleaks default rules
- TruffleHog: Commits from the base to HEAD, all detectors, --no-verification
- Kingfisher: Commits from the base to HEAD, default rules, --no-validate

### nodejs/node

| Tool        | Version                             | Cold    | Warm             | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------- | ----------------------------------- | ------- | ---------------- | -------- | -------- | ------------ | --------- | ----------- |
| Betterleaks | 2.0.0-rc.9                          | 722 ms  | 674 ms ± 23 ms   | 387 MB   | 0        | 0            | 0         | 0           |
| gitleaks    | 8.30.1                              | 1.31 s  | 1.18 s ± 51 ms   | 72 MB    | 3        |              |           |             |
| Kingfisher  | 2.19.1                              | 9.92 s  | 1.36 s ± 41 ms   | 204 MB   | 0        |              |           |             |
| **h56m**    | workspace, h56m-presets betterleaks | 2.19 s  | 1.96 s ± 36 ms   | 436 MB   | 0        |              |           |             |
| TruffleHog  | 3.99.9                              | 14.07 s | 30.49 s ± 1.67 s | 185 MB   | 0        |              |           |             |

- h56m: Commits from the base to HEAD, Betterleaks default rules, no live validation
- Betterleaks: Commits from the base to HEAD, Betterleaks default rules, no live validation
- gitleaks: Commits from the base to HEAD, gitleaks default rules
- TruffleHog: Commits from the base to HEAD, all detectors, --no-verification
- Kingfisher: Commits from the base to HEAD, default rules, --no-validate

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/h56m#<skill>`.
