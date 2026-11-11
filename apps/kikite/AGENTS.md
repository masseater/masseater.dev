# kikite

声で答えるヒアリングの聞き手。発言を文字起こしし、一定の間隔で要約し、要約と最近の発言から次の質問を作る。質問の方針を切り替えたり並べて比べたりして、よい聞き手の条件を体験から決めるためのモックである。

- デプロイ: kikite.masseater.dev（Cloudflare Access で本人だけ。Worker と Containers）
- 文字起こしはブラウザーの Web Speech API、要約と質問は Claude Agent SDK で作る
- ローカルは `vp dev` で、手元の Claude Code のログインを使う。本番は broker の `CiClaudeCodeOauthToken` をコンテナに渡す
