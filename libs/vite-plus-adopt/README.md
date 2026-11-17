# @r_masseater/vite-plus-adopt

`vpa` is a CLI that brings Betterleaks, commitlint, textlint, Steiger, fallow and agent skill installation into Vite+. Write their settings and your dependency rules in `vite.config.ts`, and `vpa` reads them from there.
Running `vpa` once with no arguments runs every configured check in parallel and prints the results together.
It also bundles a Feature-Sliced Design plugin for Steiger and @arethetypeswrong/core, both running on TypeScript 7 alone.

## Published to

- npm: [@r_masseater/vite-plus-adopt](https://www.npmjs.com/package/@r_masseater/vite-plus-adopt)

## Usage

```sh
vp add -D @r_masseater/vite-plus-adopt
```

Allow its postinstall by adding it to `allowBuilds` in `pnpm-workspace.yaml`.

```yaml
allowBuilds:
  "@r_masseater/vite-plus-adopt": true
```

```ts
import type {} from "@r_masseater/vite-plus-adopt";
import fsd from "@r_masseater/vite-plus-adopt/fsd";
import { defineConfig } from "vite-plus";

export default defineConfig({
  commitlint: { extends: ["@commitlint/config-conventional"] },
  dependencyRules: {
    banned: { "Import tests from vite-plus/test": ["vitest", "@vitest/*"] },
    peerRanges: "intersect",
  },
  betterleaks: {
    extend: { useDefault: true },
    filter: 'matchesAny(finding.line, [`\\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`])',
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

`import type {} from "@r_masseater/vite-plus-adopt"` types the 8 keys above on `defineConfig`.
textlint checks the Markdown files Git tracks. To check other files too, list their globs (`files`) and the settings for them in `textlint.sources`. `presets` work there as well.
Steiger checks only the directories matching `steiger.paths` that directly contain FSD layer folders (`app`, `pages`, `widgets`, `features`, `entities`, `shared` and so on).

Write the Git hooks like this.

```sh
# .vite-hooks/pre-commit
vpa --staged
# .vite-hooks/commit-msg
vpa --commit-msg "$1"
```

## Agent skills

List GitHub repositories and commits in `skills`, and `vpa --prepare` puts their skills in `.agents/skills/`. Skills are picked by the `name` in `SKILL.md`, and `"all"` picks every skill under `root`.

```ts
export default defineConfig({
  skills: {
    "masseater/skills": {
      commit: "40c8069607f259ab20d7cfee82f7c29b29fc65ad",
      root: "plugins/masseater-skills/skills",
      skills: "all",
    },
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

`@r_masseater/vite-plus-adopt/fsd` bundles [@feature-sliced/steiger-plugin][fsd-plugin] 0.8.2, with the same rules and `configs.recommended` as the original.
steiger itself also depends on `@feature-sliced/steiger-plugin`, which pulls in TypeScript 5.
vpa does not use the steiger CLI, so you can drop it with `overrides` in `pnpm-workspace.yaml`.

```yaml
overrides:
  "steiger>@feature-sliced/steiger-plugin": "-"
```

[fsd-plugin]: https://github.com/feature-sliced/steiger/tree/master/packages/steiger-plugin-fsd

## Replacement for @arethetypeswrong/core

`@r_masseater/vite-plus-adopt/attw` provides the same API as [@arethetypeswrong/core][attw] 0.18.5, on TypeScript 7.1 alone.
Pass it to `pack.attw.module`, and the same checks run without installing `@arethetypeswrong/core`.

```ts
import * as attw from "@r_masseater/vite-plus-adopt/attw";
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    attw: { module: attw, profile: "esm-only", level: "error" },
  },
});
```

[attw]: https://github.com/arethetypeswrong/arethetypeswrong.github.io/tree/main/packages/core

## License

MIT. The licenses of the original packages bundled in `dist/fsd.mjs`, `dist/parsers` and `dist/attw.mjs` are in `THIRD-PARTY-NOTICES`.
