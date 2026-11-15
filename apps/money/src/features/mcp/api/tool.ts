import { NO_PROJECT } from "@masseater.dev/mcp-tool-call";
import type { Caller, OVERWRITE, READ_ONLY, WRITE } from "@masseater.dev/mcp-tool-call";
import type { McpServer, StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Layer, pipe } from "effect";
import { Digest, SecureRandom } from "effect/crypto";

import type { Failure, Services } from "./database";
import { rejected } from "./rejected";
import { meteredInput, runToolIn } from "./tool-call";
import type { ToolName } from "./tool-call";

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

type DefinedTool = Readonly<{
  name: ToolName;
  annotations: Annotations;
  register: Register;
  call: (input: unknown) => Effect.Effect<unknown, Failure, Services>;
}>;

const services = Layer.mergeAll(Digest.layerWebCrypto, SecureRandom.layerWebCrypto);

const runMoneyTool = runToolIn(services);

const issuesOf = (issues: readonly Readonly<{ message: string }>[]): string =>
  pipe(
    issues,
    Arr.map(({ message }) => message),
    Arr.join("; "),
  );

const validated =
  <Input, Output>(schema: StandardSchemaWithJSON<Input, Output>) =>
  (input: unknown): Effect.Effect<Output, Failure> =>
    Effect.promise(() => Promise.resolve(schema["~standard"].validate(input))).pipe(
      Effect.flatMap((result) => {
        if ("value" in result) {
          return Effect.succeed(result.value);
        }
        return Effect.fail(rejected(issuesOf(result.issues)));
      }),
    );

const tool = <Input, Output, Value>(spec: Tool<Input, Output, Value>): DefinedTool => ({
  name: spec.name,
  annotations: spec.annotations,
  register: (caller) => (server) => {
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
  },
  call: (input) => validated(spec.input)(input).pipe(Effect.flatMap(spec.run)),
});

const registerAll =
  (tools: readonly DefinedTool[]): Register =>
  (caller) =>
  (server) => {
    for (const { register } of tools) {
      register(caller)(server);
    }
    return server;
  };

const lengthOf = (values: readonly unknown[]): number => values.length;

/** @internal */
export { lengthOf, registerAll, services, tool };
/** @internal */
export type { Annotations, DefinedTool, Register, Tool };
