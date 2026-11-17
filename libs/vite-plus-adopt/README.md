# vite-plus-adopt

[Vite+](https://viteplus.dev) checks formatting, lint and types, but leaves out secrets, GitHub Actions workflows, commit messages, prose and dependency rules.
`vpa` runs the tools for those checks (Betterleaks, actionlint, zizmor, commitlint, textlint, Steiger and fallow) from sections you add to `vite.config.ts`, so the one config file Vite+ already uses holds their settings too.
Running `vpa` once with no arguments runs every configured check in parallel and prints the results together.
Each check runs only when its section exists, so you can adopt them one at a time.
It also installs agent skills pinned to a commit, and bundles a Feature-Sliced Design plugin for Steiger and @arethetypeswrong/core, both running on TypeScript 7 alone.

## Published to

- npm: [vite-plus-adopt](https://www.npmjs.com/package/vite-plus-adopt)

## Requirements

- Node.js 26 or later, Vite+ 1.5 or later and Effect 4.1 or later.
- TypeScript 7.1 or later, only for the `/fsd` and `/attw` entry points.
- Linux, macOS or Windows on x64 or arm64, for the bundled Betterleaks, actionlint and zizmor binaries.

## Usage

```sh
vp add -D vite-plus-adopt
```

Its postinstall fetches the Betterleaks, actionlint and zizmor binaries, so the checks never download a tool at run time.
Let your package manager run it: with pnpm, add the package to `allowBuilds` in `pnpm-workspace.yaml`; with Bun, add it to `trustedDependencies` in `package.json`.

```yaml
allowBuilds:
  "vite-plus-adopt": true
```

```ts
import { defineConfig } from "vite-plus";
import type {} from "vite-plus-adopt";
import fsd from "vite-plus-adopt/fsd";

export default defineConfig({
  commitlint: { extends: ["@commitlint/config-conventional"] },
  dependencyRules: {
    banned: { "Import tests from vite-plus/test": ["vitest", "@vitest/*"] },
    peerRanges: "intersect",
  },
  betterleaks: {
    extend: { useDefault: true },
    filter: 'matchesAny(finding.line, [`\\bPUBLIC_ANALYTICS_TOKEN = "[0-9a-f]{32}"`])',
    ignoredSecrets: ["<SHA-256 of the secret>"],
  },
  steiger: { paths: ["apps/*/src"], rules: [...fsd.configs.recommended] },
  textlint: {
    ignores: ["CHANGELOG.md"],
    rules: { "preset-ja-technical-writing": true },
  },
  fallow: { production: true, rules: { "unused-files": "error" } },
  run: { tasks: { vpa: { command: "vpa", cache: false } } },
});
```

`import type {} from "vite-plus-adopt"` types the 7 keys above on `defineConfig`.
textlint checks the Markdown files Git tracks. To check other files too, list their globs (`files`) and the settings for them in `textlint.sources`. `presets` work there as well.
Steiger checks only the directories matching `steiger.paths` that directly contain FSD layer folders (`app`, `pages`, `widgets`, `features`, `entities`, `shared` and so on).

Write the Git hooks like this.

```sh
# .vite-hooks/pre-commit
vpa --staged
# .vite-hooks/commit-msg
vpa --commit-msg "$1"
```

Commit messages and Betterleaks look at the commits after the remote's default branch: `origin/HEAD`, else `origin/main` or `origin/master`.
In CI, where the clone has no such branch, set `VPA_BASE` to the commit to compare with, for example `github.event.before` on GitHub Actions.
Without any of them, `vpa` checks the whole history.

## No migration command

`vpa` has no command that converts existing config files (`.commitlintrc`, `.textlintrc`, `.gitleaks.toml`, Husky or lefthook hooks) into `vite.config.ts`, and will not get one.
Every repository arranges those files differently, and a converter cannot cover them all.
Ask a coding agent to move them instead.
The package ships the `configure-checks` skill (in `skills/`), which tells the agent the shape of each section.
Run `vp migrate` first for what Vite+ itself converts: ESLint, Prettier, lint-staged and the rest.

## Agent skills

List GitHub repositories and commits in `skills`, and `vpa --prepare` puts their skills in `.agents/skills/`. Skills are picked by the `name` in `SKILL.md`, and `"all"` picks every skill under `root`.

```ts
export default defineConfig({
  skills: {
    "cloudflare/skills": { commit: "…", root: "skills", skills: ["cloudflare"] },
    "./docs/skills": { skills: "all" },
  },
});
```

Fetched skills are stored read-only in `~/.cache/vpa/skills/` (under `XDG_CACHE_HOME`, or `LOCALAPPDATA` on Windows), and `.agents/skills/` points to them with symbolic links (junctions on Windows). A commit is fetched once per machine and shared by every worktree. Private repositories are fetched with `GITHUB_TOKEN`.

A key starting with `./` is a folder in this repository. It takes no commit and points directly to the folders under it that contain `SKILL.md`.

Put `vpa --prepare` in `prepare`. To let Renovate update the commits, extend this preset in `renovate.json`.

```json
{ "extends": ["github>masseater/masseater.dev//libs/vite-plus-adopt/renovate"] }
```

## Feature-Sliced Design plugin

`vite-plus-adopt/fsd` bundles [@feature-sliced/steiger-plugin][fsd-plugin] 0.8.2, with the same rules and `configs.recommended` as the original.
steiger itself also depends on `@feature-sliced/steiger-plugin`, which pulls in TypeScript 5.
vpa does not use the steiger CLI, so you can drop it with `overrides` in `pnpm-workspace.yaml`.

```yaml
overrides:
  "steiger>@feature-sliced/steiger-plugin": "-"
```

[fsd-plugin]: https://github.com/feature-sliced/steiger/tree/master/packages/steiger-plugin-fsd

## Replacement for @arethetypeswrong/core

`vite-plus-adopt/attw` provides the same API as [@arethetypeswrong/core][attw] 0.18.5, on TypeScript 7.1 alone.
Pass it to `pack.attw.module`, and the same checks run without installing `@arethetypeswrong/core`.

```ts
import { defineConfig } from "vite-plus";
import * as attw from "vite-plus-adopt/attw";

export default defineConfig({
  pack: {
    attw: { module: attw, profile: "esm-only", level: "error" },
  },
});
```

[attw]: https://github.com/arethetypeswrong/arethetypeswrong.github.io/tree/main/packages/core

## License

MIT. The licenses of the original packages bundled in `dist/fsd.mjs`, `dist/parsers` and `dist/attw.mjs` are in `THIRD-PARTY-NOTICES`.
