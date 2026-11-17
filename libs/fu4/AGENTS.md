# @r_masseater/fu4

このワークスペースは GitHub Actions のワークフローのリンターである。本体は Rust（`native/core`）で書き、napi のアドオン（`native/node`）を通して TypeScript から呼ぶ。設定は vite.config.ts の `fu4` に書く。アドオンは `vp run native` で作り、テストはこのタスクに依存している。

ルールは actionlint と同じ結果を返すこと。`native/core/tests/fixtures/actionlint/` は actionlint から取り込んだ fixture と期待値であり、手で直してはならない。`cargo test -p fu4-core` がすべて一致することを確かめ、一致しないものは `actionlint-known-failures.txt` に理由と一緒に書く。

`run:` のスクリプトは shellcheck を呼ばずに tree-sitter-bash で調べ、shellcheck と同じ結果を出す。`native/core/tests/fixtures/shellcheck/` の期待値は shellcheck 0.9.0 が actionlint と同じ引数で出したものであり、手で直してはならない。検査を足したら、その SC コードを `shared/shell/conformance.rs` の対象に加える。

`native/core/data/` は `vp run generate-data` が GitHub の docs とスキーマから作るので、手で直してはならない。Rust 側の処理には tracing の span を付けること。`OTEL_EXPORTER_OTLP_ENDPOINT` があるとき、span は呼び出し側のトレースの下に送られる。
