import type {
  CallToolResult,
  McpServer,
  StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import type { Effect } from "effect";

import type { Runner, Services } from "./tool-result.ts";

/** @internal */
export type Tool = (run: Runner) => (server: McpServer) => void;

/** @internal */
export const defineTool =
  <Input>({
    name,
    description,
    inputSchema,
    handle,
  }: Readonly<{
    name: string;
    description: string;
    inputSchema: StandardSchemaWithJSON<unknown, Input>;
    handle: (input: Input) => Effect.Effect<CallToolResult, never, Services>;
  }>): Tool =>
  (run) =>
  (server) => {
    server.registerTool(name, { description, inputSchema }, (input) => run(handle(input)));
  };

/** @internal */
export const registerToolList =
  (tools: readonly Tool[]) =>
  (run: Runner) =>
  (server: McpServer): McpServer => {
    for (const tool of tools) {
      tool(run)(server);
    }
    return server;
  };
