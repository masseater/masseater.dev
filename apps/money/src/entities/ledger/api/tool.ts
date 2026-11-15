import { NO_PROJECT } from "@masseater.dev/mcp-tool-call";
import type { Caller, OVERWRITE, READ_ONLY, WRITE } from "@masseater.dev/mcp-tool-call";
import type { McpServer, StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Layer, pipe } from "effect";
import type { Effect } from "effect";
import { Digest, SecureRandom } from "effect/crypto";

import { meteredInput, runToolIn } from "#/shared/api";
import type { ToolName } from "#/shared/api";

import type { Failure, Services } from "./database";

type Annotations = Readonly<typeof READ_ONLY> | Readonly<typeof WRITE> | Readonly<typeof OVERWRITE>;

type Tool<Input, Output, Value> = Readonly<{
  name: ToolName;
  description: string;
  input: StandardSchemaWithJSON<Input, Output>;
  annotations: Annotations;
  run: (input: Output) => Effect.Effect<Value, Failure, Services>;
  count: (value: Value) => number;
}>;

type Register = (caller: Caller) => (server: McpServer) => McpServer;

const runMoneyTool = runToolIn(Layer.mergeAll(Digest.layerWebCrypto, SecureRandom.layerWebCrypto));

const tool =
  <Input, Output, Value>(spec: Tool<Input, Output, Value>): Register =>
  (caller) =>
  (server) => {
    const meter = { tool: spec.name, caller, project: NO_PROJECT } as const;
    server.registerTool(
      spec.name,
      {
        description: spec.description,
        inputSchema: meteredInput(meter)(spec.input),
        annotations: spec.annotations,
      },
      (input) => pipe(spec.run(input), runMoneyTool({ ...meter, input, count: spec.count })),
    );
    return server;
  };

const registerAll =
  (tools: readonly Register[]): Register =>
  (caller) =>
  (server) => {
    for (const register of tools) {
      register(caller)(server);
    }
    return server;
  };

const lengthOf = (values: readonly unknown[]): number => values.length;

/** @internal */
export { lengthOf, registerAll, tool };
/** @internal */
export type { Annotations, Register, Tool };
