# aredoko-desktop

このワークスペースは、Tauri 製の aredoko デスクトップアプリである。ユーザーの PC 上で aredoko の検索サーバーを起動・停止させる。

画面を確認するには、`vp run dev:app` で開発ビルドを起動し、`agent-browser connect 9222` で接続する。

開発中にトレースを収集するには、開発ビルドを開始する前に `vp run jaeger` を実行し、`http://127.0.0.1:16686` でトレースを確認する。`jaeger` は自身で PATH に追加しておくこと。
