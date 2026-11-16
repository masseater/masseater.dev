# shirushi

このワークスペースはデスクトップアプリの shirushi である。オーナーは YouTube、ニコニコ、SoundCloud の楽曲を再生し、好きな範囲や苦手な範囲にしるしを付ける。しるしはオーナーの PC に保存する。作曲 AI は、アプリが `127.0.0.1` の MCP で提供する `list_marks` でそれを読み取る。

他人の楽曲の音声や、それから作ったステムは、このリポジトリやインストーラーへ入れないこと。

画面は `tauri://localhost` ではなく、tauri-plugin-localhost が `http://127.0.0.1` の空きポートから配る。カスタムスキームの画面からは Referer が送られず、YouTube の埋め込みが Error 153 で止まるからである。このため、コマンドを足したら `src-tauri/build.rs` と `capabilities/default.json` にも足す。
