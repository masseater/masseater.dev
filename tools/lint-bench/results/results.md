# Lint benchmark

Measured 2026-11-19T01:41:40.307Z on linux x64, 4 CPUs. masseater.dev at 8c9683a092f6eb7744284a6bd45b6a10f19d1fdb, nodejs/node at dd425b79bfd39e2f6f0d17cbc68aeeea8e6d9e00. Cold runs drop the page cache and the tools' caches first.

## Markdown (y8)

### masseater.dev

| Tool              | Version                                                 | Cold   | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------------- | ------------------------------------------------------- | ------ | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| rumdl             | 0.3.4                                                   | 388 ms | 94 ms ± 12 ms   | 32 MB    | 7198     | 3836         | 2648      | 3362        |
| **y8**            | workspace                                               | 1.37 s | 777 ms ± 48 ms  | 221 MB   | 6484     |              |           |             |
| markdownlint-cli2 | 0.24.1                                                  | 3.83 s | 3.61 s ± 219 ms | 254 MB   | 6486     | 6484         | 0         | 2           |
| remark-lint       | remark-cli 12.0.1, remark-preset-lint-recommended 7.0.1 | 3.96 s | 3.74 s ± 103 ms | 346 MB   | 5080     |              |           |             |

- y8: Markdown files git tracks, markdownlint's default rules
- markdownlint-cli2: Markdown files git tracks, markdownlint's default rules
- rumdl: Markdown files git tracks, markdownlint's default rules
- remark-lint: Markdown files git tracks, remark-preset-lint-recommended

### nodejs/node

| Tool              | Version                                                 | Cold    | Warm           | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------------- | ------------------------------------------------------- | ------- | -------------- | -------- | -------- | ------------ | --------- | ----------- |
| rumdl             | 0.3.4                                                   | 1.06 s  | 138 ms ± 11 ms | 81 MB    | 92719    | 84761        | 16312     | 7958        |
| **y8**            | workspace                                               | 2.45 s  | 1.36 s ± 65 ms | 429 MB   | 101073   |              |           |             |
| markdownlint-cli2 | 0.24.1                                                  | 37.35 s | 35.76 s ± 0 ms | 1051 MB  | 101075   | 101071       | 2         | 4           |
| remark-lint       | remark-cli 12.0.1, remark-preset-lint-recommended 7.0.1 | 36.24 s | 36.24 s ± 0 ms | 1496 MB  | 8508     |              |           |             |

- y8: Markdown files git tracks, markdownlint's default rules
- markdownlint-cli2: Markdown files git tracks, markdownlint's default rules
- rumdl: Markdown files git tracks, markdownlint's default rules
- remark-lint: Markdown files git tracks, remark-preset-lint-recommended

## Structure and dependencies (wism)

### masseater.dev

| Tool                     | Version                                      | Cold     | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ------------------------ | -------------------------------------------- | -------- | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| ls-lint                  | 2.3.2                                        | 280 ms   | 144 ms ± 11 ms  | 57 MB    | 0        |              |           |             |
| **wism**                 | workspace                                    | 3.99 s   | 2.80 s ± 78 ms  | 466 MB   | 0        |              |           |             |
| dependency-cruiser       | 18.8.0                                       | 5.76 s   | 4.72 s ± 106 ms | 576 MB   | 0        |              |           |             |
| Sheriff                  | 0.20.0                                       | 36.13 s  | 35.39 s ± 0 ms  | 290 MB   | 0        |              |           |             |
| eslint-plugin-boundaries | 7.4.4 on ESLint 10.15.0                      | 78.27 s  | 77.22 s ± 0 ms  | 666 MB   | 0        |              |           |             |
| steiger                  | 0.10.0, @feature-sliced/steiger-plugin 0.8.2 | 290.92 s | 294.30 s ± 0 ms | 260 MB   | 395      |              |           |             |

- wism: The repository's own config: placement, FSD layers and imports of TS, Rust and Markdown
- dependency-cruiser: FSD layer imports in apps/_/src, libs/_/src and tools/*/src
- eslint-plugin-boundaries: FSD layer imports in apps/_/src, libs/_/src and tools/*/src
- Sheriff: FSD layer imports in apps/_/src, libs/_/src and tools/*/src, from every file in src/app
- steiger: FSD recommended rules, one run per src directory
- ls-lint: File and directory names in apps/_/src, libs/_/src and tools/*/src

## GitHub Actions (fu4)

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

## Secrets (h56m)

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
