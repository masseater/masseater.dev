# Lint benchmark

Measured 2026-11-18T16:35:14.305Z on linux x64, 4 CPUs. masseater.dev at 821c4a701528d33b34ce729e09611e6f271ef270, nodejs/node at dd425b79bfd39e2f6f0d17cbc68aeeea8e6d9e00. Cold runs drop the page cache and the tools' caches first.

## Markdown (y8)

### masseater.dev

| Tool              | Version                                                 | Cold   | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------------- | ------------------------------------------------------- | ------ | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| rumdl             | 0.3.4                                                   | 231 ms | 55 ms ± 5 ms    | 48 MB    | 7162     | 3800         | 2538      | 3362        |
| **y8**            | workspace                                               | 895 ms | 549 ms ± 39 ms  | 251 MB   | 6338     |              |           |             |
| markdownlint-cli2 | 0.24.1                                                  | 2.96 s | 2.81 s ± 138 ms | 305 MB   | 6340     | 6338         | 0         | 2           |
| remark-lint       | remark-cli 12.0.1, remark-preset-lint-recommended 7.0.1 | 3.50 s | 3.25 s ± 187 ms | 336 MB   | 5080     |              |           |             |

- y8: Markdown files git tracks, markdownlint's default rules
- markdownlint-cli2: Markdown files git tracks, markdownlint's default rules
- rumdl: Markdown files git tracks, markdownlint's default rules
- remark-lint: Markdown files git tracks, remark-preset-lint-recommended

### nodejs/node

| Tool              | Version                                                 | Cold    | Warm           | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ----------------- | ------------------------------------------------------- | ------- | -------------- | -------- | -------- | ------------ | --------- | ----------- |
| rumdl             | 0.3.4                                                   | 899 ms  | 131 ms ± 13 ms | 160 MB   | 92719    | 84761        | 16312     | 7958        |
| **y8**            | workspace                                               | 2.07 s  | 1.13 s ± 86 ms | 472 MB   | 101073   |              |           |             |
| remark-lint       | remark-cli 12.0.1, remark-preset-lint-recommended 7.0.1 | 32.37 s | 31.20 s ± 0 ms | 1701 MB  | 8508     |              |           |             |
| markdownlint-cli2 | 0.24.1                                                  | 35.20 s | 35.58 s ± 0 ms | 1198 MB  | 101075   | 101071       | 2         | 4           |

- y8: Markdown files git tracks, markdownlint's default rules
- markdownlint-cli2: Markdown files git tracks, markdownlint's default rules
- rumdl: Markdown files git tracks, markdownlint's default rules
- remark-lint: Markdown files git tracks, remark-preset-lint-recommended

## Structure and dependencies (wism)

### masseater.dev

| Tool                     | Version                                      | Cold     | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ------------------------ | -------------------------------------------- | -------- | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| ls-lint                  | 2.3.2                                        | 330 ms   | 143 ms ± 16 ms  | 58 MB    | 0        |              |           |             |
| **wism**                 | workspace                                    | 3.54 s   | 2.46 s ± 49 ms  | 460 MB   | 0        |              |           |             |
| dependency-cruiser       | 18.8.0                                       | 5.40 s   | 4.23 s ± 145 ms | 577 MB   | 0        |              |           |             |
| Sheriff                  | 0.20.0                                       | 44.84 s  | 44.92 s ± 0 ms  | 339 MB   | 0        |              |           |             |
| eslint-plugin-boundaries | 7.4.4 on ESLint 10.15.0                      | 69.17 s  | 71.13 s ± 0 ms  | 706 MB   | 0        |              |           |             |
| steiger                  | 0.10.0, @feature-sliced/steiger-plugin 0.8.2 | 286.24 s | 266.14 s ± 0 ms | 257 MB   | 382      |              |           |             |

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
| ghalint             | 1.6.0                                | 73 ms   | 28 ms ± 4 ms     | 14 MB    | 35       |              |           |             |
| actionlint          | 1.7.12                               | 105 ms  | 68 ms ± 3 ms     | 25 MB    | 0        |              |           |             |
| zizmor              | 1.32.0                               | 151 ms  | 100 ms ± 16 ms   | 32 MB    | 0        |              |           |             |
| actionlint + zizmor | 1.7.12 + 1.32.0                      | 227 ms  | 172 ms ± 20 ms   | 31 MB    | 0        | 0            | 0         | 0           |
| poutine             | 1.1.6                                | 584 ms  | 387 ms ± 27 ms   | 54 MB    | 39       |              |           |             |
| **fu4**             | workspace, fu4-presets recommended() | 1.76 s  | 1.49 s ± 79 ms   | 465 MB   | 0        |              |           |             |
| sisakulint          | 0.3.8                                | 10.74 s | 11.19 s ± 375 ms | 22 MB    | 46       |              |           |             |

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
| ghalint             | 1.6.0                                | 271 ms | 139 ms ± 17 ms  | 18 MB    | 92       |              |           |             |
| zizmor              | 1.32.0                               | 223 ms | 177 ms ± 20 ms  | 36 MB    | 18       |              |           |             |
| actionlint          | 1.7.12                               | 358 ms | 321 ms ± 13 ms  | 29 MB    | 68       |              |           |             |
| actionlint + zizmor | 1.7.12 + 1.32.0                      | 553 ms | 498 ms ± 19 ms  | 36 MB    | 86       | 63           | 1         | 23          |
| poutine             | 1.1.6                                | 1.56 s | 732 ms ± 50 ms  | 54 MB    | 43       |              |           |             |
| **fu4**             | workspace, fu4-presets recommended() | 2.76 s | 2.44 s ± 110 ms | 541 MB   | 64       |              |           |             |
| sisakulint          | 0.3.8                                | 8.82 s | 8.55 s ± 863 ms | 30 MB    | 31       |              |           |             |

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
