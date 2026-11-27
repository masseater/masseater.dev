import { compactInput } from "@masseater.dev/mcp-tool-call";
import type { OVERWRITE, READ_ONLY, WRITE } from "@masseater.dev/mcp-tool-call";
import type { McpServer, StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Layer, pipe } from "effect";
import { Digest, SecureRandom } from "effect/crypto";

import type { Database } from "#/shared/db/index.server.ts";
import type { StorageFailed } from "#/shared/db/index.ts";

import { InvalidRecord } from "./invalid-record.ts";
import type { ToolRun } from "./tool-call.server.ts";

/** @internal */
export type Failure = StorageFailed | InvalidRecord;

/** @internal */
export type Services = Database | Digest.Digest | SecureRandom.SecureRandom;

/** @internal */
export type Annotations =
  | Readonly<typeof READ_ONLY>
  | Readonly<typeof WRITE>
  | Readonly<typeof OVERWRITE>;

/** @internal */
export type Tool<Input, Output, Value> = Readonly<{
  name: string;
  description: string;
  input: StandardSchemaWithJSON<Input, Output>;
  annotations: Annotations;
  run: (input: Output) => Effect.Effect<Value, Failure, Services>;
  count: (value: Value) => number;
}>;

/** @internal */
export type Register = (server: McpServer) => McpServer;

/** @internal */
export type Registers = (runTool: ToolRun<Services>) => Register;

/** @internal */
export type DefinedTool = Readonly<{
  name: string;
  annotations: Annotations;
  register: Registers;
  call: (input: unknown) => Effect.Effect<unknown, Failure, Services>;
}>;

/** @internal */
export const services = Layer.mergeAll(Digest.layerWebCrypto, SecureRandom.layerWebCrypto);

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
        return Effect.fail(InvalidRecord.make({ message: issuesOf(result.issues) }));
      }),
    );

/** @internal */
export const tool = <Input, Output, Value>(spec: Tool<Input, Output, Value>): DefinedTool => ({
  name: spec.name,
  annotations: spec.annotations,
  register: (runTool) => (server) => {
    server.registerTool(
      spec.name,
      {
        description: spec.description,
        inputSchema: compactInput(spec.input),
        annotations: spec.annotations,
      },
      (input) => pipe(spec.run(input), runTool({ count: spec.count })),
    );
    return server;
  },
  call: (input) => validated(spec.input)(input).pipe(Effect.flatMap(spec.run)),
});

/** @internal */
export const registerAll =
  (tools: readonly DefinedTool[]): Registers =>
  (runTool) =>
  (server) => {
    for (const { register } of tools) {
      register(runTool)(server);
    }
    return server;
  };
