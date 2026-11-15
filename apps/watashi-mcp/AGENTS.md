# watashi-mcp

このワークスペースは MCP サーバー `watashi.masseater.dev/mcp` である。そこには、持ち主の人生の記録、AI エージェントの作業メモ、家計簿といった個人データが保持されている。

- 作業メモから人生の記録を書かないこと。逆はよく、根拠は `evidence` に残す。
- 持ち主が作って公開するものの道具は、ここではなく sundries に置く。
- 家計簿の表（`ledger_*`）は銀行やカードの CSV が原本なので、書き込みにリビジョンを残さない。そのため `*-writer.server.ts` に限る lint の決まりから外している。
- 家計簿のデータの形は team-mirai/marumie（AGPL-3.0）を下敷きにしている。ポータルのお金のページは、Portal の Worker の `MoneyPortal` から読み取り専用のツールを呼ぶ。
