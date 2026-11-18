---
title: "Vite+: bringing lint, formatting, testing and task running into the vp command"
description: "Examples of how Vite+ gathers settings into vite.config.ts, lints with Oxlint, caches with Vite Task, manages Node.js and package manager versions, and runs Git hooks."
tags: ["Vite+", "TypeScript", "ツールチェーン"]
published: true
---

A TypeScript repository holds [ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [Vitest](https://vitest.dev/), [lint-staged](https://github.com/lint-staged/lint-staged), a Node.js version manager and a task runner side by side, each with its own configuration file. In [Vite+](https://viteplus.dev/), these are brought together into a single command, `vp`, and a single configuration file, `vite.config.ts`[^vite-guide-getting-started]. It is developed by [VoidZero](https://voidzero.dev/) and released under the MIT license[^announcing-vite-1-0]. It is not a successor to Vite but a layer for calling Vite, Vitest, Oxc and [Rolldown](https://rolldown.rs/) from a single command[^announcing-vite-1-0].

| Command                         | What runs inside                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `vp dev`、`vp build`            | Vite 8 and Rolldown                                                                                               |
| `vp check`、`vp lint`、`vp fmt` | [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) |
| `vp test`                       | Vitest                                                                                                            |
| `vp pack`                       | [tsdown](https://tsdown.dev/)                                                                                     |
| `vp run`                        | Vite Task                                                                                                         |
| `vp install`、`vp add`、`vp pm` | The detected package manager                                                                                      |
| `vp env`                        | Version management for Node.js and the package manager                                                            |
| `vp hooks`、`vp staged`         | Git hooks                                                                                                         |

## Settings are gathered into vite.config.ts

If you import `defineConfig` from `vite-plus`, you can write the `lint`, `fmt`, `test`, `run` and `staged` keys in the same file as Vite's `server` and `build`[^vite-configuring-vite]. `.eslintrc`, `.prettierrc`, `vitest.config.ts` and `.lintstagedrc` are no longer needed.

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: { ignorePatterns: ["out/**"] },
  lint: {
    ignorePatterns: ["out/**"],
    rules: { "no-debugger": "error", "typescript/no-explicit-any": "error", eqeqeq: "error" },
  },
  staged: { "*": "vp check --fix" },
  run: {
    tasks: {
      gen: { command: "node gen.mjs", cache: { output: ["out/**"] } },
      report: { command: "node report.mjs", dependsOn: ["gen"] },
    },
  },
});
```

## Lint

`vp lint` is actually Oxlint, and rules are specified with ESLint-compatible names.

```ts
// src/bad.ts
export const f = (x: any) => {
  debugger;
  return x == null;
};
```

```text
$ vp lint
src/bad.ts:1:22: error typescript(no-explicit-any): Unexpected `any`. Specify a different type.
src/bad.ts:2:3: error eslint(no-debugger): `debugger` statement is not allowed
src/bad.ts:3:12: error eslint(eqeqeq): Expected === and instead saw ==
```

Enabling `typeAware` and `typeCheck` in `lint.options` switches to checks that use type information. Per-file exceptions go in `lint.overrides`[^vite-lint-config].

## Vite Task

`vp run <name>` can run both the scripts in `package.json` and the tasks defined in `run.tasks`. The difference is caching: tasks in `run.tasks` are cached by default, while scripts are cached only when `--cache` is given[^vite-run].

In the settings above, `gen` reads `src/words.txt` and writes `out/count.json`, and `report` reads it. The first time, both run.

```text
$ vp run report
$ node gen.mjs
counted 3 words

$ node report.mjs
report: {"count":3}

vp run: 0/2 cache hit (0%), 2/2 successful.
```

If you run it again without changing anything, the commands are not run, and the saved output is replayed.

```text
$ vp run report
$ node gen.mjs ◉ cache hit, replaying
counted 3 words

$ node report.mjs ◉ cache hit, replaying
report: {"count":3}

vp run: 2/2 cache hit (100%), 2/2 successful, 88ms saved.
```

If you add a line to `src/words.txt`, it shows, with the reason, which file's change invalidated the cache.

```text
$ vp run report
$ node gen.mjs ○ cache miss: 'src/words.txt' modified, executing
counted 4 words

$ node report.mjs ○ cache miss: 'out/count.json' modified, executing
report: {"count":4}
```

The settings do not list `src/words.txt` as an input. This works because the files read, the paths checked for existence and the directories listed while a task runs are recorded and used for the next cache decision[^vite-task-caching]. The `out/**` written in `cache.output` is restored on a cache hit, so `report` can read what `gen` produced.

Only reads of environment variables cannot be recorded from the run, so you write the ones to include in the cache key in `cache.env`, and the ones to pass to the task without including them in the key in `cache.untrackedEnv`[^vite-task-caching]. In `dependsOn`, you can also specify tasks of other packages in the form `package#task`, and `vp run -r <task>` runs the whole workspace in dependency order[^vite-run].

## Version management for Node.js and the package manager

`vp env` manages the versions of the Node.js runtime and the package manager. The Node.js version is decided by looking for `.node-version`, `devEngines.runtime`, `engines.node` and `.nvmrc`, starting from the nearest directory. Archives fetched from nodejs.org are verified with a PGP signature and SHA-256[^vite-environment]. The package manager is detected from `packageManager`, `devEngines.packageManager` and the lockfile, in that order, and if none of them exists, it becomes pnpm[^vite-package-management]. `vp install` and `vp add` are converted into the commands of the detected package manager, so the commands you type are the same in a pnpm repository and in an npm repository.

## Git hooks

Running `vp config` installs a Git hook dispatcher. Scripts such as `.vite-hooks/pre-commit` are committed to the repository, and the generated files are placed under `.vite-hooks/_` and ignored[^vite-commit-hooks]. `vp staged` bundles lint-staged 17, and checks only the staged files according to the `staged` key in the settings[^vite-commit-hooks].

```sh
# .vite-hooks/pre-commit
vp staged
```

You can disable them per clone with `vp hooks disable`, and setting `VP_GIT_HOOKS=0` temporarily stops all hooks[^vite-commit-hooks].

[^vite-guide-getting-started]: Vite+ Guide - Getting Started. https://viteplus.dev/guide/

[^announcing-vite-1-0]: Announcing Vite+ 1.0. https://voidzero.dev/posts/announcing-vite-plus-1-0

[^vite-configuring-vite]: Vite+ - Configuring Vite+. https://viteplus.dev/config

[^vite-lint-config]: Vite+ - Lint config. https://viteplus.dev/config/lint

[^vite-run]: Vite+ - Run. https://viteplus.dev/guide/run

[^vite-task-caching]: Vite+ - Task Caching. https://viteplus.dev/guide/cache

[^vite-environment]: Vite+ - Environment. https://viteplus.dev/guide/env

[^vite-package-management]: Vite+ - Package Management. https://viteplus.dev/guide/package-management

[^vite-commit-hooks]: Vite+ - Commit Hooks. https://viteplus.dev/guide/commit-hooks
