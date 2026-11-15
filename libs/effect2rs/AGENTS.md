# effect2rs

このワークスペースは、Effect の SchemaRepresentation を走査することで、Effect Schema から serde の Rust 型を生成する。`tools/protocol-codegen` がこれを呼び出し、出力を書き出す。

TypeScript と Rust が型を共有する場合は、`skills/` の `share-types-with-rust` スキルに従う。`pnpm exec intent load @masseater.dev/effect2rs#share-types-with-rust` でロードする。
