# personal-mcp

持ち主が作って公開・管理するもの（Sloppedia、masseater.dev のアクセス解析、スライド）を扱う MCP サーバー。持ち主の個人データは watashi-mcp に置き、ここには置かない。

- デプロイ: personal-mcp.masseater.dev（MCP は /mcp）。main の verify の `personal-mcp` ジョブが当てる
- 認証は Cloudflare Access の managed OAuth で、スライドのサイトと同じ personal-space の mydecklist スタックの `OwnerPolicy` と Google の IdP を `ref` で引く。Worker は `Cf-Access-Jwt-Assertion` を、このアプリの aud とチームの issuer で確かめる
- mcp.masseater.dev のポータルの上流 id は `personal` で、Access の DCR が許すダッシュボードのコールバックの末尾と同じにする
- ツールの呼び出しは `@masseater.dev/mcp-tool-call` で Analytics Engine の `masseater_dev_personal_tool_calls` と Workers Logs に記録する
