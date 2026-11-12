# 会話履歴の取り込み

持ち主と AI の会話履歴を watashi-mcp に残し、後から AI の作業を追えるようにする仕組みである。今の対象は Claude Code のトランスクリプトだけで、クラウドのセッションのように後から読み返せない会話も含めて全部を残す。

## 流れ

送る側は `libs/watashi-cli` で、npm の `@r_masseater/watashi-cli` として出し、Claude Code のプラグイン `watashi` を兼ねる。このプラグインが Stop フックで `watashi hook stop` を非同期に動かす。モデルは関わらないので、トークンを使わず送り忘れもない。送るのは環境変数 `WATASHI_SEND_CONVERSATIONS=1` を置いた環境だけで、既定では送らない。仕事の環境には置かない。

CLI は、前回送った位置から後ろの完全な行だけを読み、書きかけの行は次の Stop に回す。subagent のトランスクリプト（`<セッション>/subagents/agent-*.jsonl`）も別のファイルとして送る。送る前に手元で Betterleaks（版は CLI の `BETTERLEAKS_VERSION`）を通し、見つかった秘密を `[REDACTED:<規則>]` に置き換える。Betterleaks が無いときや、伏せても検出が消えないときは送らないので、生の秘密は手元から出ない。

伏せた JSONL は gzip にして `PUT /api/conversations` に送る。サーバーは R2 の `masseater-dev-watashi-mcp-conversations` に置き、D1 の `conversation_chunk` に範囲を記録する。AI は MCP の `conversation_read` で、会話の一覧と本文を読む。

`conversation_read` に `view: "owner"` を渡すと、持ち主の発言だけを `{uuid, timestamp, text}` の並びで返す。行の読み取りは [claude-code-jsonl-parser](https://github.com/book000/claude-code-jsonl-parser) に任せ、ツールの結果、フックが差し込んだ文、subagent への指示は除く。claude.ai のプロジェクトの会話では、人の発言と、引用された本人の発言だけを取り出す。

## 秘密の伏せ方

Betterleaks の既定の規則に、2 つの規則を足して使う。1 つは `wat_` で始まる watashi のトークンの規則である。もう 1 つは貼り付けられた高エントロピーの文字列の規則で、32 文字以上で大文字・小文字・数字を含むものを拾う。セッションやツール呼び出しの ID、コミットの SHA、UUID はこの規則から外す。

検査には JSON の文字列を取り出した形を渡すので、エスケープされた改行や、JSON の中の JSON に埋まった秘密も見つかる。画像の base64 は、検査と置き換えのどちらにも回さない。base64 などで符号化された秘密は、検出された範囲をまるごと置き換える。範囲が文字列をまたいで置き換えられないときは、`uuid`・`parentUuid`・`type`・`timestamp` だけを残してその行を伏せる。

`libs/watashi-cli/src/mask.test.ts` は、15 種の偽の秘密を 5 通りの埋め込み方で入れ、送る本文に 1 つも残らないことを確かめる。偽の秘密はテストの実行時に作るので、リポジトリには入らない。

## 送り方の約束

範囲はトランスクリプトのバイト位置で表す。サーバーは前の範囲の終わりから始まる範囲だけを受け取り、ずれていれば `409` と受け取り済みの位置を返す。CLI はその位置から読み直すので、手元の記録を失っても続きから送れる。同じ範囲を 2 つの Stop が同時に送ったときは、D1 の主キー（kind・セッション・ファイル・開始位置）が、先に着いた方だけを通す。1 回に送るのは 2 MiB までの行のまとまりである。

## 認証

手元の PC では `watashi login` で OAuth（動的登録と PKCE）を通し、リフレッシュトークンを `~/.config/watashi/oauth.json` に置く。

クラウドのセッションは使い捨てなので、長期のトークンをクラウド環境の環境変数 `WATASHI_TOKEN` に入れる。トークンは手元で `watashi token issue --scope conversation:write` を実行して発行する。MCP の `api_token_issue` を `scope: "conversation:write"` で呼んでもよい。MCP の接続は持ち主の OAuth を通っているので、パスキーを使えないクラウドのセッションからでも発行できる。このトークンでできるのは、会話履歴の送信と受け取り済みの位置の確認だけである。D1 の `api_token` には SHA-256 の値だけを置き、`watashi token revoke <id>` で失効させる。

## 送信と読み出しの記録

送信の結果は Analytics Engine の `masseater_dev_watashi_conversation_uploads` に記録する。記録するのは結果・source・認証の種類と、元のバイト数・保存したバイト数・伏せた数・処理時間である。Workers Logs には `event=conversation_upload` で出る。`conversation_read` の呼び出しは、ほかのツールと同じく `masseater_dev_watashi_tool_calls` に入る。

## まだ解決していないこと

データは消さずに積み上がり続ける。上限も、古い会話を要約して消す仕組みも、まだ無い。R2 は 10 GB を超えた分に課金され、D1 の `conversation_chunk` は 1 行がチャンク 1 つなので行数も増え続ける。

Claude Code 以外のツール（Codex など）の会話は、まだ受け取らない。受け取るときは `kind` を足す。Betterleaks の規則を後から変えても、送り済みの会話は伏せ直さない。
