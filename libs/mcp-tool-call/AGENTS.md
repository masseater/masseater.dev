# @masseater.dev/mcp-tool-call

This workspace holds the parts shared by every MCP server: the endpoint that verifies Cloudflare Access tokens, and the record of each tool call that every server writes to Analytics Engine in the same shape.

Do not change the column order. Every server writes the same columns.

Every MCP server serves through `meteredMcpHandler` (or `accessMcpEndpoint`, which uses it). It reads the JSON-RPC request and response and records every request whose JSON-RPC method is tools/call automatically, including calls rejected by input validation and calls to unknown tools, so tools need no metering code. `runTool` only turns an Effect into a tool result and passes the error tag and result count in `_meta`.

`registeredTool` takes an optional `outputSchema`. `runTool` puts a result that is an object into `structuredContent` as well as the text, so a tool with an `outputSchema` must return an object. The portal runs in Code Mode, where agents write code against the typed result.

`skillCatalog` and `withSkills` serve a skill from a server through the MCP Skills extension. Workflow rules such as "call A before B" go in that skill, never in a tool description.
