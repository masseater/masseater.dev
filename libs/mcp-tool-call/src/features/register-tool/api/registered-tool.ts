import type {
  McpServer,
  StandardSchemaWithJSON,
  ToolAnnotations,
  ToolCallback,
} from "@modelcontextprotocol/server";
import { Function as Fn } from "effect";

const ARITY = 3;

export type ToolSpec<Input extends StandardSchemaWithJSON> = Readonly<{
  name: string;
  description: string;
  inputSchema: Input;
  annotations: ToolAnnotations;
}>;

export const registeredTool: {
  <Input extends StandardSchemaWithJSON>(
    spec: ToolSpec<Input>,
    handle: ToolCallback<Input>,
  ): (server: McpServer) => McpServer;
  <Input extends StandardSchemaWithJSON>(
    server: McpServer,
    spec: ToolSpec<Input>,
    handle: ToolCallback<Input>,
  ): McpServer;
} = Fn.dual(
  ARITY,
  <Input extends StandardSchemaWithJSON>(
    server: McpServer,
    { name, description, inputSchema, annotations }: ToolSpec<Input>,
    handle: ToolCallback<Input>,
  ): McpServer => {
    server.registerTool(name, { description, inputSchema, annotations }, handle);
    return server;
  },
);
