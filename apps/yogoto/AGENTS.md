# yogoto

このワークスペースはデスクトップアプリのよごとである。オーナーが曲のリンクやファイルを投げると、元の音声をそのまま保管し、BS-RoFormer 系のモデルで stem に分離してライブラリに置く。曲や素材を使う AI は、アプリが `127.0.0.1` で提供する MCP で取り込みと分離を頼み、結果のファイルを読む。

曲フォルダはアプリのローカルデータの `library/songs/<id>/` にあり、`song.json`、元の音声の `sources/`、分離結果の `stems/<分離の id>/<stem>.flac` を持つ。stem は元の音声と同じサンプルレート、同じ長さにそろえる。`song.json` の形は `libs/yogoto-protocol` の Effect Schema で決める。

他人の曲や、そこから作った stem は、このリポジトリやインストーラーへ入れないこと。

画面は tauri-plugin-localhost が `http://127.0.0.1` の空きポートから配る。コマンドを足したら `src-tauri/build.rs` と `capabilities/default.json` にも足す。NVIDIA の GPU で分離するときは `cuda` の feature を付けてビルドする。
