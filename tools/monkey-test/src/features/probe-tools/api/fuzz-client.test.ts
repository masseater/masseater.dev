import { it } from "@effect/vitest";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, Duration, Effect, Schema, pipe } from "effect";
import { expect } from "vite-plus/test";

import { fuzzClient } from "./fuzz-client.ts";

const SEED = 20_000;
const TIMEOUT_MILLISECONDS = 300;
const LATE_MILLISECONDS = 3000;
const LATE = Duration.millis(LATE_MILLISECONDS);
const NO_CALLS = 0;

const Query = pipe(
  Schema.Struct({ query: Schema.String }),
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const READ = { readOnlyHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: true };

const serverCalls = { writer: 0 };

const text = (value: string): { content: { type: "text"; text: string }[] } => ({
  content: [{ type: "text", text: value }],
});

const late = Effect.sleep(LATE).pipe(Effect.as(text("late")));

const build = (): McpServer => {
  const server = new McpServer({ name: "fixture", version: "0.0.0" });
  server.registerTool(
    "fine",
    { description: "Answers.", inputSchema: Query, annotations: READ },
    () => text("ok"),
  );
  server.registerTool(
    "mute_error",
    { description: "Fails without a message.", inputSchema: Query, annotations: READ },
    () => ({ isError: true, content: [] }),
  );
  server.registerTool(
    "stuck",
    { description: "Never answers.", inputSchema: Query, annotations: READ },
    () => Effect.runPromise(late),
  );
  server.registerTool(
    "writer",
    { description: "Writes.", inputSchema: Query, annotations: WRITE },
    () => {
      serverCalls.writer += 1;
      return text("written");
    },
  );
  return server;
};

const connected = Effect.fn("fixture.connect")(function* connected() {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "fixture-client", version: "0.0.0" });
  yield* Effect.promise(() => build().connect(serverSide));
  yield* Effect.promise(() => client.connect(clientSide));
  return client;
});

it.effect("finds a silent error and a hang, and never calls a write tool", () =>
  Effect.gen(function* fuzzedFixture() {
    const client = yield* connected();
    const findings = yield* fuzzClient({
      client,
      host: "fixture.test",
      seed: SEED,
      timeout: Duration.millis(TIMEOUT_MILLISECONDS),
    }).pipe(Effect.orDie);
    const found = pipe(
      findings,
      Arr.map(({ kind, target }) => `${kind} ${target}`),
    );
    expect(found).toContain("mcp-contract fixture.test mute_error");
    expect(found).toContain("mcp-hang fixture.test stuck");
    expect(found).not.toContain("mcp-contract fixture.test fine");
    expect(serverCalls.writer).toBe(NO_CALLS);
  }),
);
