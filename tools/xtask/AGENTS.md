# @masseater.dev/xtask

Rust 製の開発タスクランナー（cargo xtask）。

## 判断のルール

- プラグインの一覧をコードに手で書かない。apps 配下の Cargo.toml から cdylib を検出する形を保つ
- 実処理は nice-plug-xtask 側に置く。ここは委譲だけの薄い層に保つ
