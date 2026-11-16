# akapen

このワークスペースはデスクトップアプリ akapen である。持ち主は YouTube、ニコニコ、PC 上のファイルの動画を再生し、その範囲に感想や直してほしいことを書く。コメントは持ち主の PC に残る。動画を作ったり直したりする AI は、アプリが `127.0.0.1` で提供する MCP の `list_comments` でそれを読み、対応したものに `resolve_comment` で印を付ける。

ファイルは中身の SHA-256 で見分けるので、ファイル名を変えてもコメントは同じ書き出しを指し続ける。

他人の動画をこのリポジトリやインストーラーに入れないこと。

画面は shirushi と同じく tauri-plugin-localhost で `http://127.0.0.1` の空いているポートから配り、YouTube の埋め込みに Referer が届くようにしている。コマンドを足すときは `src-tauri/build.rs` と `capabilities/default.json` にも足すこと。
