# @masseater.dev/mcp-portal

上流 MCP サーバー群を集約する Cloudflare Access の MCP ポータルの IaC。

- デプロイ: mcp.masseater.dev

## 判断のルール

- 公開範囲はオーナー本人だけにする。第三者向けに開く変更はしない
- 設定の正はこの IaC にする。ダッシュボード側の手作業で変えない
- Cloudflare の上流には読み取りの権限だけを渡す。書き込みの権限を足さない
