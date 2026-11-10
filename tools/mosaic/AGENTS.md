# mosaic

キャラクターごとに VocaDB の曲のサムネイルを集め、元画像のマスに割り当て、`apps/mosaic` が配るファイルを書き出す Rust のコマンドである。

- `cargo run --release -p mosaic -- <songs|pool|solve|site|all> [キャラクター...] [--limit 曲数]` で動かす。`--limit` を付けると評価順の上位だけで試せる。
- キャラクターは `libs/mosaic/src/characters.json` に足す。ここには書かない。
- 割り当ては、各マスに近い 300 枚と無作為の 24 枚だけを辺にした疎な最小重みの完全マッチングで解く。`matching.rs` のテストが総当たりと比べる。
- `site.rs` と `image.rs` を変えると公開ファイルのリビジョンが変わり、全キャラクターのファイルを作り直す。
