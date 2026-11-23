# @r_masseater/oxlint-typed-rules

Runs ESLint rules that need type information as oxlint JS plugins.
oxlint does not pass type information to JS plugins ([oxc#19596](https://github.com/oxc-project/oxc/issues/19596)),
so this package builds a Program and a type checker with the TypeScript 7 API and provides the `parserServices` the rules read.
Type-aware rules then run on oxlint alone, without installing ESLint.

```sh
npm install -D @r_masseater/oxlint-typed-rules
```

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/oxlint-typed-rules#<skill>`.

## Published to

npm: [@r_masseater/oxlint-typed-rules](https://www.npmjs.com/package/@r_masseater/oxlint-typed-rules)

## Ported rules

| Entry point                                       | Contents                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `@r_masseater/oxlint-typed-rules/tanstack-start`  | The 2 rules of [@tanstack/eslint-plugin-start][tanstack]                           |
| `@r_masseater/oxlint-typed-rules/tanstack-query`  | All rules and configs of [@tanstack/eslint-plugin-query][tanstack-query] 5.105.3   |
| `@r_masseater/oxlint-typed-rules/tanstack-router` | All rules and configs of [@tanstack/eslint-plugin-router][tanstack-router] 1.162.0 |
| `@r_masseater/oxlint-typed-rules/drizzle`         | All rules and configs of [eslint-plugin-drizzle][drizzle] 0.2.3                    |
| `@r_masseater/oxlint-typed-rules/remotion`        | All rules and configs of [@remotion/eslint-plugin][remotion] 4.0.541               |
| `@r_masseater/oxlint-typed-rules/react`           | All rules and configs of [@eslint-react/eslint-plugin][eslint-react] 5.30.5        |

[tanstack]: https://www.npmjs.com/package/@tanstack/eslint-plugin-start
[tanstack-query]: https://www.npmjs.com/package/@tanstack/eslint-plugin-query
[tanstack-router]: https://www.npmjs.com/package/@tanstack/eslint-plugin-router
[drizzle]: https://www.npmjs.com/package/eslint-plugin-drizzle
[remotion]: https://www.npmjs.com/package/@remotion/eslint-plugin
[eslint-react]: https://www.npmjs.com/package/@eslint-react/eslint-plugin

## Performance

The same rules were compared against ESLint (typescript-eslint).
Measured on 2026-11-03 under these conditions.

The targets were `apps/portfolio/src` of [masseater.dev][masseater-dev] (238 files)
and a React slide app in the owner's private repository (1,434 files, 52,000 lines).
The oxlint side used oxlint 1.90.0, oxlint-tsgolint 7.0.2005 and TypeScript 7.1.0-beta.
The ESLint side used ESLint 9.39.5 and typescript-eslint 8.72.1 (`projectService`).
ESLint stayed on 9 because `@tanstack/eslint-plugin-start` 0.1.0 does not support ESLint 10.
The same patch was applied on the ESLint side, and both sides reported the same violations.
The machine ran Linux with Node.js 26.13.0, 4 cores and 16 GB of memory.
Cold is the median of 3 runs after dropping the OS page cache.
Warm is the median of 5 runs with the page cache filled, without ESLint's `--cache`.
Memory is the peak total RSS, including the tsgo and tsgolint child processes.

[masseater-dev]: https://github.com/masseater/masseater.dev

Results for `apps/portfolio/src` of masseater.dev:

| Rules and tool                     |   Cold |   Warm |   Memory |
| ---------------------------------- | -----: | -----: | -------: |
| No rules, oxlint                   | 0.11 s | 0.06 s |    99 MB |
| No rules, ESLint                   | 6.29 s | 5.93 s | 1,288 MB |
| 2 TanStack rules, this package     | 1.90 s | 1.61 s |   769 MB |
| 2 TanStack rules, ESLint           | 6.76 s | 5.75 s | 1,324 MB |
| `no-floating-promises`, tsgolint   | 1.22 s | 1.03 s |   796 MB |
| `no-floating-promises`, ESLint     | 7.15 s | 6.35 s | 1,395 MB |
| 3 rules, this package and tsgolint | 2.84 s | 2.59 s | 1,449 MB |
| 3 rules, ESLint                    | 7.53 s | 6.64 s | 1,416 MB |

Results for the React slide app:

| Rules and tool                     |    Cold |    Warm |   Memory |
| ---------------------------------- | ------: | ------: | -------: |
| No rules, oxlint                   |  0.17 s |  0.06 s |   107 MB |
| No rules, ESLint                   |  7.69 s |  6.95 s | 1,700 MB |
| 2 TanStack rules, this package     |  3.83 s |  3.81 s |   911 MB |
| 2 TanStack rules, ESLint           | 10.56 s |  9.70 s | 1,799 MB |
| `no-floating-promises`, tsgolint   |  1.04 s |  0.91 s |   697 MB |
| `no-floating-promises`, ESLint     |  8.96 s |  8.29 s | 1,737 MB |
| 3 rules, this package and tsgolint |  4.79 s |  4.57 s | 1,500 MB |
| 3 rules, ESLint                    | 11.00 s | 10.31 s | 1,763 MB |

The 2 TanStack rules run 2.5 to 3.6 times faster than on ESLint, with 50 to 60 percent of the memory.

When oxlint has a typescript-eslint rule of the same name, run it with tsgolint.
This package is for running the rules that tsgolint lacks, without ESLint.
Combined with tsgolint, type information is built twice, once by tsgo and once by tsgolint, and memory grows by that much.

## License

MIT. The licenses of the bundled original plugins are in `libs/oxlint-typed-rules/LICENSE`.
