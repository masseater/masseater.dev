---
title: "Vite+: リント、フォーマット、テスト、タスクをvpコマンドに統合"
description: "Vite+が設定をvite.config.tsに収集し、Oxlintでリントを行い、Vite Taskでキャッシュし、Node.jsやパッケージマネージャーのバージョンを管理し、Gitフックを実行する例。"
tags: ["Vite+", "TypeScript", "ツールチェーン"]
published: true
---

TypeScriptのリポジトリには、[ESLint](https://eslint.org/)、[Prettier](https://prettier.io/)、[Vitest](https://vitest.dev/)、[lint-staged](https://github.com/lint-staged/lint-staged)、Node.jsのバージョンマネージャー、そしてタスクランナーが共存しており、それぞれに独自の設定ファイルが用意されている。[Vite+](https://viteplus.dev/)では、これらが `vp` という単一のコマンドと、`vite.config.ts`[^vite-guide-getting-started] という単一の設定ファイルにまとめられている。[VoidZero](https://voidzero.dev/)によって開発され、MITライセンス[^announcing-vite-1-0]で公開されている。Viteの後継ではなく、単一のコマンドでVite、Vitest、Oxc、および[Rolldown](https://rolldown.rs/)を呼び出すためのレイヤーである[^announcing-vite-1-0]。

| コマンド                        | 内部で動作するもの                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `vp dev`、`vp build`            | Vite 8 と Rolldown                                                                                                   |
| `vp check`、`vp lint`、`vp fmt` | [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) および [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) |
| `vp test`                       | Vitest                                                                                                               |
| `vp pack`                       | [tsdown](https://tsdown.dev/)                                                                                        |
| `vp run`                        | Vite Task                                                                                                            |
| `vp install`、`vp add`、`vp pm` | 検出されたパッケージマネージャー                                                                                     |
| `vp env`                        | Node.js とパッケージマネージャーのバージョン管理                                                                     |
| `vp hooks`、`vp staged`         | Gitフック                                                                                                            |

## 設定は vite.config.ts にまとめられている

`vite-plus` から `defineConfig` をインポートすれば、`lint`、`fmt`、`test`、`run`、`staged` キーを Vite の `server` や `build`[^vite-configuring-vite] と同じファイルに記述できる。`.eslintrc`、`.prettierrc`、`vitest.config.ts`、`.lintstagedrc`は不要になった。

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

`vp lint` は実際には Oxlint であり、ルールは ESLint 互換の名前で指定される。

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

`lint.options` で `typeAware` と `typeCheck` を有効にすると、型情報を用いたチェックに切り替わる。ファイルごとの例外は `lint.overrides`[^vite-lint-config] に記述する。

## Vite Task

`vp run <name>` は、`package.json` 内のスクリプトと `run.tasks` で定義されたタスクの両方を実行できる。違いはキャッシュだ。`run.tasks` のタスクはデフォルトでキャッシュされるが、スクリプトは `--cache` を指定したときのみキャッシュされる[^vite-run]。

上記の設定では、`gen` は `src/words.txt` を読み込み `out/count.json` を書き込み、`report` はそれを読み込む。1回目は両方とも動く。

```text
$ vp run report
$ node gen.mjs
counted 3 words

$ node report.mjs
report: {"count":3}

vp run: 0/2 cache hit (0%), 2/2 successful.
```

何も変更せずに再度実行すると、コマンドは実行されず、保存された出力が再生される。

```text
$ vp run report
$ node gen.mjs ◉ cache hit, replaying
counted 3 words

$ node report.mjs ◉ cache hit, replaying
report: {"count":3}

vp run: 2/2 cache hit (100%), 2/2 successful, 88ms saved.
```

`src/words.txt` に1行追加すると、どのファイルの変更でキャッシュが無効化されたかという理由とともに表示される。

```text
$ vp run report
$ node gen.mjs ○ cache miss: 'src/words.txt' modified, executing
counted 4 words

$ node report.mjs ○ cache miss: 'out/count.json' modified, executing
report: {"count":4}
```

設定には `src/words.txt` が入力として記載されていない。これは、タスク実行中に読み込まれたファイル、存在確認されたパス、および列挙されたディレクトリが記録され、次のキャッシュ判定に利用されるためである[^vite-task-caching]。`cache.output` で記述された `out/**` はキャッシュヒット時に復元されるため、`report` は `gen` が生成したものを読み取ることができる。

環境変数の読み取り値のみは実行時に記録できないため、キャッシュキーに含めるものは `cache.env` に、キーに含めずにタスクに渡すものは `cache.untrackedEnv` に記述する[^vite-task-caching]。`dependsOn` では、`package#task` という形式で他のパッケージのタスクを指定することもでき、`vp run -r <task>` を実行すると、ワークスペース全体を依存関係の順に実行する[^vite-run]。

## Node.js とパッケージマネージャーのバージョン管理

`vp env` は Node.js ランタイムとパッケージマネージャーのバージョンを管理する。Node.jsのバージョンは、最も近いディレクトリから `.node-version`、`devEngines.runtime`、`engines.node`、`.nvmrc` を探すことで決定する。nodejs.orgから取得したアーカイブは、PGP署名とSHA-256[^vite-environment]で検証されている。パッケージマネージャーは `packageManager`、`devEngines.packageManager`、ロックファイルの順に検出され、いずれも存在しない場合は pnpm[^vite-package-management] となる。`vp install` と `vp add` は検出されたパッケージマネージャーのコマンドに変換されるため、入力したコマンドは pnpm リポジトリでも npm リポジトリでも同一になる。

## Git hooks

`vp config` を実行すると、Gitフックディスパッチャーがインストールされる。`.vite-hooks/pre-commit` などのスクリプトはリポジトリにコミットされ、生成されたファイルは `.vite-hooks/_` 配下に置かれ、無視される[^vite-commit-hooks]。`vp staged` は lint-staged 17 をバンドルし、設定の `staged` キーに従ってステージ済みファイルのみをチェックする[^vite-commit-hooks]。

```sh
# .vite-hooks/pre-commit
vp staged
```

クローンごとに `vp hooks disable` で無効化でき、`VP_GIT_HOOKS=0` と設定すればすべてのフックが一時的に停止する[^vite-commit-hooks]。

[^vite-guide-getting-started]: Vite+ Guide - Getting Started. https://viteplus.dev/guide/

[^announcing-vite-1-0]: Announcing Vite+ 1.0. https://voidzero.dev/posts/announcing-vite-plus-1-0

[^vite-configuring-vite]: Vite+ - Configuring Vite+. https://viteplus.dev/config

[^vite-lint-config]: Vite+ - Lint config. https://viteplus.dev/config/lint

[^vite-run]: Vite+ - Run. https://viteplus.dev/guide/run

[^vite-task-caching]: Vite+ - Task Caching. https://viteplus.dev/guide/cache

[^vite-environment]: Vite+ - Environment. https://viteplus.dev/guide/env

[^vite-package-management]: Vite+ - Package Management. https://viteplus.dev/guide/package-management

[^vite-commit-hooks]: Vite+ - Commit Hooks. https://viteplus.dev/guide/commit-hooks
