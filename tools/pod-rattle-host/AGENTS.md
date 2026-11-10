# @masseater.dev/pod-rattle-host

Pod Rattle のプラグインを、ホストの側から動かして確かめるツールである。

- `vp run host` は VST3 を作り、[vst3-host](https://crates.io/crates/vst3-host) で VST3 を読み込んでノートを送り、同じノートをエンジンに直接渡した出力と標本単位で比べる。pod-rattle ワークフローが 3 OS で動かす。
- `tests/editor.rs` は egui_kittest でエディタを画面なしに描き、ボタン・スライダー・ステージを操作して、パラメーターの変化と `tests/snapshots/` の画像との一致を確かめる。画像を描き直すときは `UPDATE_SNAPSHOTS=1 cargo test -p pod-rattle-host --test editor` を実行し、出た画像を見てからコミットする。
- エディタのテストは nice-plug の `GuiContextInner`（unsafe なトレイト）を実装するので、このクレートだけはワークスペースの `unsafe_code = "forbid"` を引き継がない。
