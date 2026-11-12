# 作業メモの一括書き込み

claude.ai のプロジェクトメモリのような、ほかの場所で育った AI の作業メモを watashi の memory に写すことがある。そのときは MCP の `memory_write` を 1 件ずつ呼ばずに、`PUT /api/memories` へまとめて送る。モデルに本文を書き写させると、件数が多いときに取りこぼしや書き換えが起きるからである。

body は `{"memos": [...]}` で、各要素は `memory_write` の入力と同じ形をとる。`project` と `name` で 1 件を指し、無ければ作り、あれば渡した項目だけを置き換える。中身が今と同じ要素は書かず、リビジョンも増やさない。そのため同じ内容を何度送っても履歴は膨らまず、定期的な同期にそのまま使える。消えたメモは `retract: true` と `reason` を送って取り消す。

要素は先頭から順に書く。書けない要素があるとそこで止め、422 で `errorTag`・`text` とそれまでに書けた ref の `written` を返す。書き込みは冪等なので、直してから全体を送り直せばよい。1 回の呼び出しで Worker が D1 に出せる問い合わせには上限があるので、送る側は 50 件ずつ程度に分けて送る。

認証は持ち主の OAuth か、scope が `memory:write` の API トークンである。トークンは MCP の `api_token_issue` を `scope: "memory:write"` で呼んで発行する。書き込みのリビジョンの actor は `api:oauth` か `api:token` になる。呼び出しごとに Workers Logs へ `event=memory_import` のログを出す。
