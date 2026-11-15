# @r_masseater/msch

このワークスペースは `msch` で、持ち主のチェックポリシーである。リポジトリ内の問題（例えば同一の値セットが 2 回書き込まれているなど）を検出し、共有の oxlint 設定を提供する。

`src` は Feature-Sliced Design で分けている。検査は `src/features/<検査>` に 1 つずつ置き、`src/app/all-checks.ts` から呼ぶ。複数の検査が読むパッケージ・ワークスペース・プロジェクトは `src/entities`、構文木やファイル一覧の読み取りは `src/shared/lib` に置く。

value-owners は tsconfig ごとの結果を `node_modules/.cache/msch/value-owners` に残す。msch 自身、owner、そのプロジェクトと workspace 依存のファイル、ルートのファイルが変わらなければ、解析を飛ばす。CI では verify.yml がこのディレクトリを Actions のキャッシュに残す。
