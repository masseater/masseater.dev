# twilog-mcp

このワークスペースはMCPサーバー `twilog.masseater.dev/mcp` である。各アカウントに対して公式の twilog-mcp を1回ずつ呼び出し、Twilog上のオーナーのXアカウントを1回の呼び出しで検索する。クレデンシャルブローカーはアカウントごとに個別のログイン情報を管理しており、アカウントは `infra/repositories/oauth-targets.ts` の `TWILOG_ACCOUNTS` に一覧表示される。
