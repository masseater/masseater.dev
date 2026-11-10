# vite-plus-adopt

Betterleaks・actionlint・zizmor・commitlint・textlint・markdownlint・Steiger・fallow を Vite+ に取り込み、設定と依存の規則を `vite.config.ts` に書いて、そこから読んで動かす CLI `vpa` である。
引数なしの `vpa` を 1 回実行すると、設定のある検査をすべて並行して動かし、結果をまとめて出す。
TypeScript 7 だけで動く Feature-Sliced Design の Steiger プラグインと @arethetypeswrong/core も同梱する。
各ツールのために `.betterleaks.toml`・`.betterleaksignore`・`.textlintrc`・`.textlintignore`・`.markdownlint-cli2.jsonc`・`.fallowrc.jsonc`・`steiger.config.ts`・syncpack の設定・`package.json` の `commitlint` を置かずに済む。
Betterleaks・actionlint・zizmor のバイナリは、postinstall が固定した版を GitHub のリリースから取り、SHA-256 を照合してパッケージの `vendor/` に置く。実行時には取りに行かない。
設定は Vite+ の `resolveConfigFromFile` で読み、型は `vite` の `UserConfig` を拡張して付ける。

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
import type {} from "@r_masseater/vite-plus-adopt";
import fsd from "@r_masseater/vite-plus-adopt/fsd";
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

Git のフックは次のように書く。

```sh
# .vite-hooks/pre-commit
vpa --staged
# .vite-hooks/commit-msg
vpa --commit-msg "$1"
```

## Feature-Sliced Design のプラグイン

`@r_masseater/vite-plus-adopt/fsd` は [@feature-sliced/steiger-plugin][fsd-plugin] 0.8.2 を同梱したもので、ルールと `configs.recommended` は元と同じである。
元のプラグインが使う [@feature-sliced/filesystem][fsd-filesystem] は、import の解決に TypeScript 5 の `ts.resolveModuleName` を使い、TypeScript 7 だけの環境では読み込めない。
同梱した版では、その解決を TypeScript 7.1 の `typescript/sync` の `createModuleResolver` で行う。
そのため `typescript` 7.1 を依存に持つ。使う側のほかの依存が TypeScript 5 を引き込んでいても、こちらは 7.1 を読む。

steiger 本体も `@feature-sliced/steiger-plugin` に依存し、それが TypeScript 5 を引き込む。
vpa は steiger の CLI を使わないので、`pnpm-workspace.yaml` の `overrides` で外せる。

```yaml
overrides:
  "steiger>@feature-sliced/steiger-plugin": "-"
```

[fsd-plugin]: https://github.com/feature-sliced/steiger/tree/master/packages/steiger-plugin-fsd
[fsd-filesystem]: https://github.com/feature-sliced/filesystem

## @arethetypeswrong/core の置き換え

`@r_masseater/vite-plus-adopt/attw` は [@arethetypeswrong/core][attw] 0.18.5 と同じ API を、TypeScript 7.1 だけで出す。
元のパッケージは TypeScript 5.6.1-rc を依存に持つので、Vite+ の `pack.attw` をそのまま使うと TypeScript 5 が入る。
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

- 元のパッケージの `dist/` を `upstream/attw-core/lib` に置いて同梱し、その中の `typescript` の import を `src/attw/typescript.ts` に向ける。
- `src/attw/typescript.ts` は、元のパッケージが呼ぶ `ts.*` だけを持つ。
  モジュールの解決、プログラムの組み立て、シンボルの束縛は、TypeScript 5.6.1-rc の処理を TypeScript 7.1 の構文木の上で書き直してある。
- 型の問い合わせは、パッケージのファイルを仮想のファイルシステムとして TypeScript 7.1 の型検査器に見せて答える。
- 元のパッケージの `internal/multiCompilerHost.js` は、`src/attw/compiler-hosts.ts` に差し替える。
- `upstream/attw-core/lib` には `upstream/attw-core/lib.patch` を当ててある。
  TypeScript 7 の構文木に無い `escapedText` を `text` に読み替え、型定義の `typescript` の import を `typescript/sync` に向ける。
- `typesVersions` は TypeScript 5.6.1-rc として照合し、`ts.version` も `5.6.1-rc` を返す。結果を元のパッケージと揃えるためである。

### テスト

- `upstream/attw-core/test` は元のリポのテストを手を入れずに置いたものである。
  テストが読む `fixtures` と `snapshots` は `upstream/attw-core/` の直下に、元のパッケージの `src/` は `upstream/attw-core/src` に置く。
- `tests/attw` は、本物の @arethetypeswrong/core 0.18.5 と TypeScript 5.6.1-rc の結果と突き合わせる。
  入力は `tests/attw/fixtures.json`、期待する結果は `tests/attw/expected.json` にある。
- `tests/attw/expected.json` は、このリポの外の空のディレクトリに `@arethetypeswrong/core@0.18.5` を入れて作る。
  `fixtures.json` の `fixtures` を `checkPackage` に、`hostLookups` を `internal/multiCompilerHost.js` の `CompilerHostWrapper` の `resolveModuleName` に渡す。
  `paths` は TypeScript 5.6.1-rc の `getRootLength`・`normalizePath`・`getNormalizedAbsolutePath`・`getDirectoryPath`・`combinePaths`・`getPathComponents` に、`packageNames` は `mangleScopedPackageName`・`unmangleScopedPackageName`・`getTypesPackageName` に渡す。
  返った値を `JSON.stringify` して書き出す。
  TypeScript 5 をこのリポの依存に入れないため、作る仕組みはリポに置かない。

[attw]: https://github.com/arethetypeswrong/arethetypeswrong.github.io/tree/main/packages/core

## 検査

| 検査         | 動く条件                     | 動き                                                                                                                                                                                       |
| ------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| betterleaks  | `betterleaks` セクション     | 基準のコミットから `HEAD` までの履歴を、postinstall が置いた Betterleaks で検査する。セクションを TOML にして `BETTERLEAKS_CONFIG_TOML` に入れ、`ignoredSecrets` を `--ignore-file` で渡す |
| commitlint   | `commitlint` セクション      | 基準のコミットから `HEAD` までを `git log --first-parent` で並べ、各メッセージを検査する                                                                                                   |
| actionlint   | `.github/workflows` がある   | postinstall が置いた actionlint を動かす                                                                                                                                                   |
| zizmor       | `.github/workflows` がある   | postinstall が置いた zizmor で `.github` を検査する。`CLAUDE_CODE_REMOTE` があると `--no-online-audits` を付ける                                                                           |
| dependencies | `dependencyRules` セクション | `pnpm-workspace.yaml` の各パッケージの `package.json` を読み、禁止した依存と、同じ依存の指定の食い違いを報告する                                                                           |
| steiger      | `steiger` セクション         | git が扱うファイルを含むディレクトリのうち `paths` の glob に合うものを、`rules` で検査する                                                                                                |
| textlint     | `textlint` セクション        | git が扱う `*.md` のうち `ignores` に合わないものを検査する                                                                                                                                |
| markdownlint | `markdownlint` セクション    | git が扱う `*.md` のうち `ignores` に合わないものを、`config` と `customRules` で検査する                                                                                                  |
| fallow       | `fallow` セクション          | セクションを一時ファイルに書いて `-c` で渡し、使う側の `fallow` で全体・`dead-code --no-production`・`dupes`・`security` を検査し、コンポーネントの props の受け渡しの指摘も失敗にする     |

基準のコミットは環境変数 `VPA_BASE` で渡す。無いときや解決できないときは `origin/main` を使う。
`vpa --staged` は `git diff --cached` を Betterleaks に渡し、`vpa --commit-msg <ファイル>` はそのコミットメッセージを `commitlint` セクションで検査する。`#` で始まる行は読まない。
postinstall が動いていないと、Betterleaks・actionlint・zizmor の検査は `allowBuilds` に足すよう告げて失敗する。
バイナリの版は `src/binaries.ts` で固定し、vite-plus-adopt の版を上げて変える。

## 設定

- `betterleaks.ignoredSecrets` は `.betterleaksignore` と同じく秘密の SHA-256 を並べる。それ以外のキーは `.betterleaks.toml` と同じで、通す指摘は `filter` と `prefilter` の式で書く。
- `dependencyRules.banned` は、理由ごとに禁止する依存名の glob を並べる。`*` は任意の文字列に合う。
- `dependencyRules.allowed` は、理由ごとに `banned` の例外を書く。`workspaces` のワークスペースの、`dependencies` の名前の glob に合う依存を禁止しない。`fields` を書くと、その欄（`devDependencies` など）の依存だけを例外にする。
- `dependencyRules.exactDependencies` は、理由ごとにワークスペースのディレクトリの glob を並べる。合うワークスペースの `dependencies` は正確な版でなければならず、ほかのワークスペースとの指定の一致は求めない。git の依存として読まれるパッケージのように、カタログを使えないものに使う。
- `dependencyRules.peerRanges` を `"intersect"` にすると、`peerDependencies` の範囲は重なれば通る。省くと、ほかの依存と同じく指定の一致を求める。`workspace:` の指定は比べない。
- `textlint.ignores` は git の glob で、それ以外のキーは `.textlintrc` と同じである。規則のパッケージは、リポのルートの `node_modules` から読む。
- `markdownlint.config` は markdownlint の規則の設定で、省くと既定の規則で検査する。`ignores` は git の glob である。
- `steiger.paths` は検査するディレクトリの glob、`steiger.rules` は `steiger.config.ts` の中身と同じである。
- `fallow` は `.fallowrc.json` と同じキーを書く。fallow は使う側の依存に入れる。

## ライセンス

MIT。`dist/fsd.mjs`・`dist/parsers`・`dist/attw.mjs` に同梱した元のパッケージのライセンスは `THIRD-PARTY-NOTICES` にある。
