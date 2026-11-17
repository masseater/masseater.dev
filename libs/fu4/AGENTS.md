# @r_masseater/fu4

このワークスペースは GitHub Actions のワークフローのリンターである。本体は Rust（`native/core`）で書き、napi のアドオン（`native/node`）を通して TypeScript から呼ぶ。設定は vite.config.ts の `fu4` に書く。

- ルールは actionlint と同じ結果を返すこと。`native/core/tests/fixtures/actionlint/` は actionlint から取り込んだ fixture と期待値で、手で直さないこと。`cargo test -p fu4-core` がすべて一致することを確かめる。一致しないものは `actionlint-known-failures.txt` に理由と一緒に書く。
- `native/core/data/` は `vp run generate-data` が GitHub の docs とスキーマから作る。手で直さないこと。
- Rust 側の処理には tracing の span を付けること。`OTEL_EXPORTER_OTLP_ENDPOINT` があるとき、span は呼び出し側のトレースの下に送られる。
- アドオンは `vp run native` で作る。テストはこのタスクに依存している。
