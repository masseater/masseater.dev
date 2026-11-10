# @masseater.dev/mcp-tool-call

MCP サーバーのツール呼び出しを、Analytics Engine の 1 行と Workers Logs の `event=mcp_tool_call` に同じ形で記録する部品。watashi-mcp と personal-mcp が使う。

- 書く列は blob が tool・status・errorTag・client・project・userAgent、double が latencyMs・inputBytes・outputBytes・resultCount で、どのサーバーでも変えない
- 入力の検証で弾かれた呼び出しも errorTag `InvalidInput` で記録する
