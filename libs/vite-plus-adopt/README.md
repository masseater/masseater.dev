# vite-plus-adopt

`vpa` は、Betterleaks・actionlint・zizmor・commitlint・textlint・markdownlint・Steiger・fallow を Vite+ に取り込む CLI である。設定と依存の規則を `vite.config.ts` に書くと、そこから読んで動かす。
引数なしの `vpa` を 1 回実行すると、設定のある検査をすべて並行して動かし、結果をまとめて出す。
TypeScript 7 だけで動く Feature-Sliced Design の Steiger プラグインと @arethetypeswrong/core も同梱する。

## 公開先

- npm: [@r_masseater/vite-plus-adopt](https://www.npmjs.com/package/@r_masseater/vite-plus-adopt)

## 使い方

```sh
vp add -D @r_masseater/vite-plus-adopt
```

postinstall を許すため、`pnpm-workspace.yaml` の `allowBuilds` に足す。

```yaml
allowBuilds:
  "@r_masseater/vite-plus-adopt": true
```

```ts
import fsd from "@r_masseater/vite-plus-adopt/fsd";
import type {} from "@r_masseater/vite-plus-adopt/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  commitlint: { extends: ["@commitlint/config-conventional"] },
  dependencyRules: {
    banned: { "テストは vite-plus/test から読む": ["vitest", "@vitest/*"] },
    peerRanges: "intersect",
  },
  betterleaks: {
    extend: { useDefault: true },
    filter: 'matchesAny(finding.line, [`\\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`])',
    ignoredSecrets: ["<秘密の SHA-256>"],
  },
  steiger: { paths: ["apps/*/src"], rules: [...fsd.configs.recommended] },
  textlint: {
    ignores: ["CHANGELOG.md"],
    rules: { "preset-ja-technical-writing": true },
  },
  markdownlint: { ignores: ["CHANGELOG.md"] },
  fallow: { production: true, rules: { "unused-files": "error" } },
  run: { tasks: { vpa: { command: "vpa", cache: false } } },
});
```

`import type {} from "@r_masseater/vite-plus-adopt"` で、`defineConfig` に上の 8 つのキーの型が付く。
Steiger は `steiger.paths` に合うディレクトリのうち、直下に FSD のレイヤー（`app`・`pages`・`widgets`・`features`・`entities`・`shared` など）のフォルダを持つものだけを検査する。

Git のフックは次のように書く。

```sh
# .vite-hooks/pre-commit
vpa --staged
# .vite-hooks/commit-msg
vpa --commit-msg "$1"
```

## Feature-Sliced Design のプラグイン

`@r_masseater/vite-plus-adopt/fsd` は [@feature-sliced/steiger-plugin][fsd-plugin] 0.8.2 を同梱したもので、ルールと `configs.recommended` は元と同じである。
steiger 本体も `@feature-sliced/steiger-plugin` に依存し、それが TypeScript 5 を引き込む。
vpa は steiger の CLI を使わないので、`pnpm-workspace.yaml` の `overrides` で外せる。

```yaml
overrides:
  "steiger>@feature-sliced/steiger-plugin": "-"
```

[fsd-plugin]: https://github.com/feature-sliced/steiger/tree/master/packages/steiger-plugin-fsd

## @arethetypeswrong/core の置き換え

`@r_masseater/vite-plus-adopt/attw` は [@arethetypeswrong/core][attw] 0.18.5 と同じ API を、TypeScript 7.1 だけで出す。
`pack.attw.module` にこれを渡せば、`@arethetypeswrong/core` を入れずに同じ検査が動く。

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

## ライセンス

MIT。`dist/fsd.mjs`・`dist/parsers`・`dist/attw.mjs` に同梱した元のパッケージのライセンスは `THIRD-PARTY-NOTICES` にある。
