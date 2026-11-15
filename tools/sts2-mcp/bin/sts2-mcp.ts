import { runMain } from "@masseater.dev/node-main";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { Effect, Layer, pipe } from "effect";
import { FetchHttpClient } from "effect/http";

import { registerTools } from "#/tools.ts";
import type { Services } from "#/tools.ts";
import { vmLayer } from "#/vm.ts";

const SERVER_INFO = { name: "sts2", version: "0.1.0" };

const stdinClosed: Effect.Effect<void> = Effect.callback((resume) => {
  globalThis.process.stdin.once("end", () => {
    resume(Effect.void);
  });
});

const serve = Effect.gen(function* serve() {
  const context = yield* Effect.context<Services>();
  const server = registerTools(Effect.runPromiseWith(context))(new McpServer(SERVER_INFO));
  yield* Effect.promise(() => server.connect(new StdioServerTransport()));
  yield* stdinClosed;
});

const mcpLayer = Layer.effectDiscard(serve).pipe(Layer.provide([vmLayer, FetchHttpClient.layer]));

pipe(mcpLayer, Layer.build, Effect.asVoid, Effect.scoped, runMain("sts2-mcp"));
