# @r_masseater/y8

このワークスペースは Markdown のリンターである。本体は Rust（`native/core`）で書き、napi のアドオン（`native/node`）を通して TypeScript から呼ぶ。設定は vite.config.ts の `y8` に書く。

- 組み込みのルールは markdownlint のルールと同じ結果を返すこと。`native/core/tests/fixtures/markdownlint/` は markdownlint から取り込んだ fixture と期待値で、手で直さないこと。`cargo test -p y8-core` がすべて一致することを確かめる。
- Rust 側の処理には tracing の span を付けること。`OTEL_EXPORTER_OTLP_ENDPOINT` があるとき、span は呼び出し側のトレースの下に送られる。
- アドオンは `vp run native` で作る。テストはこのタスクに依存している。
