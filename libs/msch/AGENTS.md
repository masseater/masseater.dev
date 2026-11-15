# @r_masseater/msch

このワークスペースは `msch` で、持ち主のチェックポリシーである。リポジトリ内の問題（例えば同一の値セットが 2 回書き込まれているなど）を検出し、共有の oxlint 設定を提供する。

`src` は Feature-Sliced Design で分けている。検査は `src/features/<検査>` に 1 つずつ置き、`src/app/all-checks.ts` から呼ぶ。複数の検査が読むパッケージ・ワークスペース・プロジェクトは `src/entities`、構文木やファイル一覧の読み取りは `src/shared/lib` に置く。

value-owners は tsconfig ごとの結果を `node_modules/.cache/msch/value-owners` に残す。msch 自身、owner、そのプロジェクトと workspace 依存のファイル、それらが node_modules から引く依存パッケージの版が変わらなければ、解析を飛ばす。CI では verify.yml がこのディレクトリを Actions のキャッシュに残す。

## msch が適用するパッケージ

msch を使っていないリポジトリでも、単体で役に立つパッケージがある。vite-plus-adopt、lint ルールのパッケージ（oxlint-typed-rules と oxlint-plugin-decision）、textlint ルールのプリセットである。これらは別々のパッケージとして npm に出し続ける。

msch はこれらのパッケージを依存に持ち、自分で適用する。msch を入れたリポジトリは、msch だけでこれらのルールと検査を使える。

msch を入れたリポジトリでは、ほかの場所からこれらのパッケージを直接使ってはならない。package.json に書かない、import しない、vite.config.ts で設定しない。msch はこれを検査し、直接の使用をすべて報告する。msch が適用するパッケージとは、msch の dependencies にある @r_masseater のパッケージである。
