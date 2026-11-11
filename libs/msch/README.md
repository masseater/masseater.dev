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
decision ルールは呼ぶたびに費用がかかるので、プリセットは有効にしない。
`decisionRules` を掛けたいファイルの overrides に渡す。

`effecttsgo` のルールは、@effect/tsgo が手を入れた oxlint でだけ動く。
`prepare` で `effect-tsgo patch --typescript --oxlint` を実行するか、`effect-tsgo vp check` で動かす。
oxlint のバージョンは、@effect/tsgo が対応するものに合わせる。

## msch の検査

リポジトリのルートで `msch` を実行すると、値の集合と形の重複、overrides の要不要、テストのためだけのコード、見えない文字、Python の使用、ルート以外の案内文書を調べる。
外部から読んだ値を Effect Schema で確かめるときは、`satisfies Schema.Decoder<ライブラリの型>` か変数の型注釈でライブラリの型に結びつける。結びつけた Schema は、ライブラリの形の写しとして指摘しない。
見えない文字は、ゼロ幅の文字・書字方向を変える制御文字・タグ文字のように、エディタやレビューで見えずに意味を変えうる文字で、`git ls-files` に載るテキストのファイルから探す。ファイル先頭の BOM と、NUL を含むバイナリは対象にしない。
Python は使わない方針なので、`.py`・`pyproject.toml`・`uv.lock` などのファイルを指摘する。スクリプト・CI・設定の中で `python3`・`pip`・`uv`・`poetry` を呼ぶ箇所と、`actions/setup-python` などの action、`mise.toml` に書いた Python の道具も指摘する。
案内文書は、`AGENTS.md`・`CLAUDE.md` をルートにだけ置かせる。
README は、ルートか、npm に出すワークスペース（`vite.config.ts` に `msch: { publish: true }` と書いたもの）にだけ置かせる。
`tsconfig.json` の `types` に `@r_masseater/msch/vite` を足すと、`defineConfig` の `msch` に型が付く。
指摘があれば終了コードは 1 になる。`--json` を付けると結果を JSON で出す。
