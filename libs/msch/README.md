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
`import/no-nodejs-modules` は使わず、Effect に代わりのある Node.js の組み込みだけを `effecttsgo/node-builtin-import` で止める。
`eslint/new-cap` は `capIsNew` を切る。`new` なしでクラスを呼ぶ誤りは型検査が落とすので、大文字で始まる関数の呼び出しを例外として並べずに済む。
`decisionRules` を掛けたいファイルの overrides に渡す。

Vite+ はワークスペースの `vite.config.ts` の `lint` を使わない。
1 つのワークスペースだけに効く設定は、そのワークスペースの `vite.config.ts` の `msch` にリテラルで書く。
ルートの `vite.config.ts` は `@r_masseater/msch/workspace-settings` の `workspaceSettings` でそれを読む。
ワークスペースは `pnpm-workspace.yaml` の `packages` から求める。
ワークスペースの `vite.config.ts` は実行しないので、アプリの重いプラグインを読み込まずに済む。
`msch.lint` には overrides と ignorePatterns を書く。読んだパスの前には、ワークスペースのディレクトリが付く。
`msch.devDependencies` には、ルートが禁じた依存を devDependencies にだけ許す理由を鍵にして、許す依存を書く。
`use` は、ルートが `workspaceSettings` に渡す `ruleSets` と `dependencySets` の名前を指す。
import した値が要る規則と依存は、ルートの集合に名前を付けて置く。
`test` タスクを持たないワークスペースは `testProjects` に入り、ルートの `vp test` が動かす。
`workspaceSettings` はタスクも返す。`tasks.verify` は、`vite.config.ts` が `verify` タスクを書く各ワークスペースの `verify` タスクを列挙し、ルートの `verify` はそれらに依存する。
`components.json` の `aliases.ui` は `package.json` の `imports` で解決し、shadcn の部品の置き場を `lint.shadcnUi` として返す。
`package.json` の `exports` と `bin` が指すファイルは `lint.publicEntries` として返す。`dist` を指す入口は、`pack.entry` から元のファイルをたどる。プラグインや textlint のルールのように、読み込む側が default export を求める入口に使う。

`effecttsgo` のルールは、@effect/tsgo が手を入れた oxlint でだけ動く。
`prepare` で `effect-tsgo patch --typescript --oxlint` を実行するか、`effect-tsgo vp check` で動かす。
oxlint のバージョンは、@effect/tsgo が対応するものに合わせる。

## msch の検査

リポジトリのルートで `msch` を実行すると、値の集合と形の重複、overrides の要不要、テストのためだけのコード、見えない文字、コメント、Python の使用、ルート以外の案内文書、npm に出すパッケージの依存の重さを調べる。
外部から読んだ値を Effect Schema で確かめるときは、`satisfies Schema.Decoder<ライブラリの型>` か変数の型注釈でライブラリの型に結びつける。結びつけた Schema は、ライブラリの形の写しとして指摘しない。
見えない文字は、ゼロ幅の文字・書字方向を変える制御文字・タグ文字のように、エディタやレビューで見えずに意味を変えうる文字で、`git ls-files` に載るテキストのファイルから探す。ファイル先頭の BOM と、NUL を含むバイナリは対象にしない。
コメントは、コード・マークアップ・設定・クエリのどれにも書かない。
msch は `git ls-files` に載るファイルを、その言語のパーサーで読んでコメントを探す。
TypeScript・JavaScript・Rust・C#・shell・PowerShell・Go・Java・Ruby・PHP・C・C++・シェーダー・CSS は tree-sitter で読む。
HTML と XML は htmlparser2 で読み、HTML の中のスクリプトとスタイルも調べる。画像の SVG は調べない。
YAML・TOML・SQL・Dockerfile は、それぞれのパーサーで読む。
許すのは、ツールが読むコメントだけである。
`oxlint-disable`・`/** @internal */`・`/** @msch <概念> */` などの lint のディレクティブと、1 行目のシェバンを許す。
`shellcheck`・`zizmor: ignore[...]`・`renovate:` も許す。
コミットに固定した action の後ろに書くバージョンと、drizzle の `--> statement-breakpoint` も許す。
lint のプリセットの `no-comments/disallowComments` も、同じ一覧を許す。
`.gitattributes` に `linguist-generated` や `linguist-vendored` とマークされたファイルや、ルートの `lint.ignorePatterns` で除外されたファイルは読み込まない。
リポジトリがコメントから独自のフォーマットを読み込む際は、ルートの `vite.config.ts` の `msch.comments.allow` に、それらのコメント用の正規表現を記述する。各記述は、コメントマーカー以降のテキストと照合される。
Python は使わない方針なので、`.py`・`pyproject.toml`・`uv.lock` などのファイルを指摘する。スクリプト・CI・設定の中で `python3`・`pip`・`uv`・`poetry` を呼ぶ箇所と、`actions/setup-python` などの action、`mise.toml` に書いた Python の道具も指摘する。
案内文書は、`AGENTS.md`・`CLAUDE.md` をルートにだけ置かせる。
ルートの `vite.config.ts` の文字列がワークスペースの中を指していると指摘する。そのワークスペースだけの設定は、そのワークスペースの `vite.config.ts` に移す。
Cargo のワークスペースがあれば、`verify` タスクを持つワークスペースの中にない crate を指摘する。
msch は、`vite.config.ts` の `verify` タスクを別のファイル内のコードから取得しているワークスペースを指摘する。ルートの `verify` は `vite.config.ts` を実行せずに読み込むため、その `verify` を一度も実行しないからである。
ルートの `vite.config.ts` に `msch: { workspaceAgentsMd: true }` と書くと、ワークスペース（`package.json` のあるディレクトリ）の直下にも `AGENTS.md` を置ける。`CLAUDE.md` はルートだけに置く。
README はルートまたはワークスペースのディレクトリ（`git ls-files` に載る `package.json` が格納されているディレクトリ）でのみ許可される。
msch は、ワークスペースのパス、ディレクトリ名、パッケージ名のいずれかを記載したルートの README を指摘する。ルートの README はリポジトリ全体について説明し、各ワークスペースの使用方法はそのワークスペースの README に記載する。
npm に出すワークスペースでは、インストールした側に増える依存の容量を `installSize` の予算と比べる。容量は、`dependencies`・`optionalDependencies`・必須の peer を node_modules からたどった合計で、そのパッケージ自身の `peerDependencies` に書いたものは数えない。予算を超えると、重い順に依存を並べ、公開の入口（`exports` と `bin`）の一部からしか import されないものにはその入口を添える。
`dependencies` に `catalog:stack` の依存があると、使う側がすでに持っているものとして、`peerDependencies` へ移すよう指摘する。
`tsconfig.json` の `types` に `@r_masseater/msch/vite` を足すと、`defineConfig` の `msch` に型が付く。
指摘があれば終了コードは 1 になる。`--json` を付けると結果を JSON で出す。
