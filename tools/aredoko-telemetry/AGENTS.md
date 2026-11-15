# aredoko-telemetry

このワークスペースでは、開発期間中の aredoko のトレースを収集するため、Jaeger をローカル PC で起動する。

開発ビルドの起動前に `vp run jaeger` を実行し、`http://127.0.0.1:16686` のトレースを確認すること。`jaeger` は自身で PATH に追加しておくこと。
