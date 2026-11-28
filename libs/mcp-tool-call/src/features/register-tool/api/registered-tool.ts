import type {
  McpServer,
  StandardSchemaWithJSON,
  ToolAnnotations,
  ToolCallback,
} from "@modelcontextprotocol/server";
import { Function as Fn, Option } from "effect";

const ARITY = 3;

export type ToolSpec<Input extends StandardSchemaWithJSON> = Readonly<{
  name: string;
  description: string;
  inputSchema: Input;
  outputSchema?: StandardSchemaWithJSON;
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
    { name, description, inputSchema, outputSchema, annotations }: ToolSpec<Input>,
    handle: ToolCallback<Input>,
  ): McpServer => {
    server.registerTool(
      name,
      {
        description,
        inputSchema,
        annotations,
        ...Option.match(Option.fromNullishOr(outputSchema), {
          onNone: () => ({}),
          onSome: (schema) => ({ outputSchema: schema }),
        }),
      },
      handle,
    );
    return server;
  },
);
