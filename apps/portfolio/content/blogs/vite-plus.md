---
title: "Vite+: lint、フォーマット、テスト、タスク実行を vp コマンドに統合する"
description: "Vite+ の vite.config.ts による設定の集約、Oxlint による lint、Vite Task のキャッシュの動き、Node.js とパッケージマネージャーの版管理、Git hooks を実行例で示す。"
tags: ["Vite+", "TypeScript", "ツールチェーン"]
published: true
---

TypeScript のリポジトリには、[ESLint](https://eslint.org/)、[Prettier](https://prettier.io/)、[Vitest](https://vitest.dev/)、[lint-staged](https://github.com/lint-staged/lint-staged)、Node.js のバージョン管理ツール、タスクランナーが、それぞれ別の設定ファイルを持って並ぶ。[Vite+](https://viteplus.dev/) では、これらが `vp` という 1 つのコマンドと `vite.config.ts` という 1 つの設定ファイルに統合される[^vite-guide-getting-started]。開発元は [VoidZero](https://voidzero.dev/) で、MIT ライセンスで公開されている[^announcing-vite-1-0]。Vite の後継ではなく、Vite、Vitest、Oxc、[Rolldown](https://rolldown.rs/) の各ツールを 1 つのコマンドから呼び出すための層である[^announcing-vite-1-0]。

| コマンド                        | 内部で動くもの                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `vp dev`、`vp build`            | Vite 8 と Rolldown                                                                                               |
| `vp check`、`vp lint`、`vp fmt` | [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) と [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) |
| `vp test`                       | Vitest                                                                                                           |
| `vp pack`                       | [tsdown](https://tsdown.dev/)                                                                                    |
| `vp run`                        | Vite Task                                                                                                        |
| `vp install`、`vp add`、`vp pm` | 検出されたパッケージマネージャー                                                                                 |
| `vp env`                        | Node.js とパッケージマネージャーの版管理                                                                         |
| `vp hooks`、`vp staged`         | Git hooks                                                                                                        |

## 設定は vite.config.ts に集約される

`defineConfig` を `vite-plus` から import すると、Vite の `server` や `build` と同じファイルに `lint`、`fmt`、`test`、`run`、`staged` のキーを書ける[^vite-configuring-vite]。`.eslintrc`、`.prettierrc`、`vitest.config.ts`、`.lintstagedrc` は不要になる。

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

## lint

`vp lint` の実体は Oxlint で、ルールは ESLint 互換の名前で指定する。

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

`lint.options` の `typeAware` と `typeCheck` を有効にすると型情報を使う検査に切り替わる。ファイルごとの例外は `lint.overrides` に書く[^vite-lint-config]。

## Vite Task

`vp run <name>` では、`package.json` の scripts と `run.tasks` に定義したタスクのどちらも実行できる。違いはキャッシュの有無で、`run.tasks` のタスクは既定でキャッシュされ、scripts は `--cache` を付けた場合だけキャッシュされる[^vite-run]。

上の設定では、`gen` が `src/words.txt` を読んで `out/count.json` を書き、`report` がそれを読む。1 回目は両方が実行される。

```text
$ vp run report
$ node gen.mjs
counted 3 words

$ node report.mjs
report: {"count":3}

vp run: 0/2 cache hit (0%), 2/2 successful.
```

何も変えずにもう一度実行すると、コマンドは実行されず、保存されていた出力が再生される。

```text
$ vp run report
$ node gen.mjs ◉ cache hit, replaying
counted 3 words

$ node report.mjs ◉ cache hit, replaying
report: {"count":3}

vp run: 2/2 cache hit (100%), 2/2 successful, 88ms saved.
```

`src/words.txt` に 1 行追加すると、どのファイルの変更でキャッシュが無効になったかが理由つきで表示される。

```text
$ vp run report
$ node gen.mjs ○ cache miss: 'src/words.txt' modified, executing
counted 4 words

$ node report.mjs ○ cache miss: 'out/count.json' modified, executing
report: {"count":4}
```

設定には `src/words.txt` を入力として書いていない。タスクの実行中に読まれたファイル、存在確認されたパス、一覧されたディレクトリが記録され、次回のキャッシュ判定に使われるためである[^vite-task-caching]。`cache.output` に書いた `out/**` はキャッシュヒット時に復元されるので、`report` は `gen` の成果物を読める。

環境変数の読み取りだけは実行から記録できないので、キャッシュキーに含めたいものを `cache.env` に、タスクには渡したいがキーには含めたくないものを `cache.untrackedEnv` に書く[^vite-task-caching]。`dependsOn` では `package#task` の形で他のパッケージのタスクも指定でき、`vp run -r <task>` でワークスペース全体を依存順に実行できる[^vite-run]。

## Node.js とパッケージマネージャーの版管理

`vp env` では Node.js の runtime とパッケージマネージャーの版を管理する。Node.js の版は、近いディレクトリから順に `.node-version`、`devEngines.runtime`、`engines.node`、`.nvmrc` を探して決定される。nodejs.org から取得したアーカイブは PGP 署名と SHA-256 で検証される[^vite-environment]。パッケージマネージャーは `packageManager`、`devEngines.packageManager`、lockfile の順で検出され、どれも無ければ pnpm になる[^vite-package-management]。`vp install` や `vp add` は検出されたパッケージマネージャーのコマンドに変換されるため、pnpm のリポジトリでも npm のリポジトリでも、打つコマンドは同じになる。

## Git hooks

`vp config` を実行すると Git hook のディスパッチャがインストールされる。`.vite-hooks/pre-commit` のようなスクリプトはリポジトリにコミットし、生成物は `.vite-hooks/_` の下に置かれて ignore の対象になる[^vite-commit-hooks]。`vp staged` には lint-staged 17 が同梱されていて、設定の `staged` キーに従って staged なファイルだけが検査される[^vite-commit-hooks]。

```sh
# .vite-hooks/pre-commit
vp staged
```

clone ごとに `vp hooks disable` で無効化でき、`VP_GIT_HOOKS=0` を設定すると一時的にすべての hook が止まる[^vite-commit-hooks]。

[^vite-guide-getting-started]: Vite+ Guide - Getting Started. https://viteplus.dev/guide/

[^announcing-vite-1-0]: Announcing Vite+ 1.0. https://voidzero.dev/posts/announcing-vite-plus-1-0

[^vite-configuring-vite]: Vite+ - Configuring Vite+. https://viteplus.dev/config

[^vite-lint-config]: Vite+ - Lint config. https://viteplus.dev/config/lint

[^vite-run]: Vite+ - Run. https://viteplus.dev/guide/run

[^vite-task-caching]: Vite+ - Task Caching. https://viteplus.dev/guide/cache

[^vite-environment]: Vite+ - Environment. https://viteplus.dev/guide/env

[^vite-package-management]: Vite+ - Package Management. https://viteplus.dev/guide/package-management

[^vite-commit-hooks]: Vite+ - Commit Hooks. https://viteplus.dev/guide/commit-hooks
