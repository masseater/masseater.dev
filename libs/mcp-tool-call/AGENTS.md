# @masseater.dev/mcp-tool-call

This workspace holds the parts shared by every MCP server: the endpoint that verifies Cloudflare Access tokens, and the record of each tool call that every server writes to Analytics Engine in the same shape.

Do not change the column order. Every server writes the same columns.

Every MCP server serves through `meteredMcpHandler` (or `accessMcpEndpoint`, which uses it). It reads the JSON-RPC request and response and records every request whose JSON-RPC method is tools/call automatically, including calls rejected by input validation and calls to unknown tools, so tools need no metering code. `runTool` only turns an Effect into a tool result and passes the error tag and result count in `_meta`.
