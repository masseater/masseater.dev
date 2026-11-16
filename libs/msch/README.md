# @r_masseater/msch

masseater のリポジトリに共通の検査の方針を、1 つのパッケージにまとめたものである。
入口は次のとおりである。

| 入口                               | 中身                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `msch`（bin）                      | 有限な値の集合とオブジェクトの形を、それを既に持つ 1 か所へ向けさせる検査      |
| `@r_masseater/msch/lint`           | Vite+ の `lint` にそのまま渡せる oxlint のプリセットと、ルールを組むための部品 |
| `@r_masseater/msch/oxlint`         | `msch` の結果を oxlint の診断として出す JS プラグイン                          |
| `@r_masseater/msch/decision-rules` | プリセットが読む decision ルールのプラグイン                                   |

Vite+ と Node.js 26 以降だけを前提にする。

## 公開先

- npm: [@r_masseater/msch](https://www.npmjs.com/package/@r_masseater/msch)

## lint のプリセット

プリセットが使う JS プラグインは msch の依存に入っていて、パスは msch の中から解決する。
使う側は msch を入れるだけで、プラグインを個別に入れなくてよい。

```ts
import { lint } from "@r_masseater/msch/lint";
import { defineConfig } from "vite-plus";

export default defineConfig({ lint });
```

リポジトリに固有のルールや overrides は、`lint` を広げてから足す。
`steigerRules` は `steiger` セクションに渡す Steiger のルールリストで、推奨の Feature-Sliced Design ルールのあとに masseater のリポジトリで足すルールを並べる。
decision ルールは呼ぶたびに費用がかかるので、プリセットは有効にしない。
`decisionRules` を掛けたいファイルの overrides に渡す。
`tracedRules` は、@r_masseater/workers-tracing でスパンを取る Worker のコードの overrides に渡す。

Vite+ はワークスペースの `vite.config.ts` の `lint` を使わない。
1 つのワークスペースだけに効く設定は、そのワークスペースの `vite.config.ts` の `msch` にリテラルで書く。
ルートの `vite.config.ts` は `@r_masseater/msch/workspace-settings` の `workspaceSettings` でそれを読む。

`effecttsgo` のルールは、@effect/tsgo が手を入れた oxlint でだけ動く。
`prepare` で `effect-tsgo patch --typescript --oxlint` を実行するか、`effect-tsgo vp check` で動かす。
oxlint のバージョンは、@effect/tsgo が対応するものに合わせる。

## msch の検査

リポジトリのルートで `msch` を実行する。チェックポリシーに従っていない箇所を報告する。
コメントは、コード・マークアップ・設定・クエリのどれにも書かない。
許すのは、ツールが読むコメントだけである。
リポジトリがコメントから独自のフォーマットを読み込む際は、ルートの `vite.config.ts` の `msch.comments.allow` に、それらのコメント用の正規表現を記述する。各記述は、コメントマーカー以降のテキストと照合される。
`tsconfig.json` の `types` に `@r_masseater/msch/vite` を足すと、`defineConfig` の `msch` に型が付く。
`msch` は、Betterleaks、commitlint、textlint、Steiger、fallow など、`vite.config.ts` で設定された vite-plus-adopt のすべてのチェックも実行する。これらのチェックでは `VPA_BASE` などの環境変数を読み取るため、タスクは `cache: false` で実行すること。Git フックでは、pre-commit で `msch --staged` を、commit-msg で `msch --commit-msg "$1"` を実行すること。
`types` に `@r_masseater/msch/vite` を指定すると、`defineConfig` の vite-plus-adopt セクションも型付けされる。`ToolSections` 型は同じエントリから来ている。
masseater の日本語の textlint ルールは、`@r_masseater/msch/lint` の `textlintPresets` を `textlint.presets` に渡し、`textlint.rules` に `"@r_masseater/preset-ja"` を書くと有効になる。
指摘があれば終了コードは 1 になる。`--json` を付けると結果を JSON で出す。
