# @r_masseater/wism

このワークスペースはファイル構造と依存関係のリンターである。本体は Rust（`native/core`）で書き、napi のアドオン（`native/node`）を通して TypeScript から呼ぶ。設定は vite.config.ts の `wism` に書く。

- ルールの判定は `native/core/src/features` に置き、ファイルの列挙、設定、診断の出力と分けておくこと。ほかのリンターと共通のエンジンへ載せ替えるとき、ルールだけを移せるようにするためである。
- Rust 側の処理には tracing の span を付けること。`OTEL_EXPORTER_OTLP_ENDPOINT` があるとき、span は呼び出し側のトレースの下に送られる。
- アドオンは `vp run native` で作る。テストはこのタスクに依存している。
