import { expect, it } from "@effect/vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { CallToolResult } from "@modelcontextprotocol/client";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Schema, pipe } from "effect";

import { authInfoOf, one, toolCalls } from "#/entities/tool-call/index.ts";

import { MeteredMcpServer } from "./metered-server.ts";

const taggedError = Schema.TaggedError;

class Missing extends taggedError<Missing, { readonly brand: unique symbol }>()("Missing", {
  key: Schema.String,
}) {}

const { runTool } = toolCalls<Missing>({
  describe: ({ key }) => ({ errorTag: "Missing", text: `${key} was not found` }),
});

const URL_OF_MCP = "https://mcp.example/mcp";

const USER_AGENT = "agent/1";

const LATENCY_COLUMNS = 1;

const Input = Schema.Struct({
  key: Schema.NonEmptyString,
  project: Schema.optional(Schema.String),
});

const INPUT_SCHEMA = Input.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

type Recorded = Readonly<{
  call: (name: string, args: Readonly<Record<string, unknown>>) => Promise<CallToolResult>;
  points: () => readonly unknown[];
}>;

const lookup = (key: string): Effect.Effect<Readonly<{ found: string }>, Missing> =>
  key === "x" ? Effect.succeed({ found: key }) : Effect.fail(Missing.make({ key }));

const serverWith = (dataset: AnalyticsEngineDataset): MeteredMcpServer => {
  const server = new MeteredMcpServer({ name: "test", version: "0.0.0" }, dataset);
  server.registerTool("lookup", { inputSchema: INPUT_SCHEMA }, ({ key }) =>
    lookup(key).pipe(runTool({ count: one })),
  );
  return server;
};

const recorded = (): Recorded => {
  const written: AnalyticsEngineDataPoint[] = [];
  const dataset: AnalyticsEngineDataset = {
    writeDataPoint: (point) => {
      written.push(point ?? {});
    },
  };
  const handler = createMcpHandler(() => serverWith(dataset));
  const fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
    handler.fetch(new Request(input, init), {
      authInfo: authInfoOf({ azp: "client-a", clientId: undefined }),
    });
  const call = async (
    name: string,
    args: Readonly<Record<string, unknown>>,
  ): Promise<CallToolResult> => {
    const client = new Client({ name: "client", version: "0.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(URL_OF_MCP), {
        fetch,
        requestInit: { headers: { "user-agent": USER_AGENT } },
      }),
    );
    const result = await client.callTool({ name, arguments: { ...args } });
    await client.close();
    return result;
  };
  const points = (): readonly unknown[] =>
    pipe(
      written,
      Arr.map((point) => ({
        indexes: point.indexes,
        blobs: point.blobs,
        doubles: Arr.drop(point.doubles ?? [], LATENCY_COLUMNS),
      })),
    );
  return { call, points };
};

const blobsOf = (points: readonly unknown[]): readonly unknown[] =>
  pipe(
    points,
    Arr.map((point) => Schema.decodeUnknownSync(Schema.Struct({ blobs: Schema.Unknown }))(point)),
    Arr.map(({ blobs }) => blobs),
  );

it.effect("登録した道具の呼び出しは、道具の側で何もしなくても 1 行ずつ記録される", () =>
  Effect.gen(function* succeeded() {
    const { call, points } = recorded();
    const result = yield* Effect.promise(() => call("lookup", { key: "x", project: "p" }));
    expect(result.isError).toBe(false);
    expect(blobsOf(points())).toStrictEqual([["lookup", "ok", "", "client-a", "p", USER_AGENT]]);
  }),
);

it.effect("失敗した呼び出しは describe の _tag を記録し、件数を 0 にする", () =>
  Effect.gen(function* failed() {
    const { call, points } = recorded();
    const result = yield* Effect.promise(() => call("lookup", { key: "y" }));
    expect(result.isError).toBe(true);
    expect(blobsOf(points())).toStrictEqual([
      ["lookup", "error", "Missing", "client-a", "", USER_AGENT],
    ]);
  }),
);

it.effect("入力の検証で弾かれた呼び出しと、無い道具の呼び出しも記録する", () =>
  Effect.gen(function* rejected() {
    const { call, points } = recorded();
    yield* Effect.promise(() => call("lookup", { key: "" }));
    yield* Effect.promise(() => call("absent", {}).catch(() => {}));
    expect(
      pipe(
        blobsOf(points()),
        Arr.map((blobs) => Schema.decodeUnknownSync(Schema.Array(Schema.String))(blobs)),
        Arr.map((blobs) => blobs.slice(0, 2)),
      ),
    ).toStrictEqual([
      ["lookup", "error"],
      ["absent", "error"],
    ]);
  }),
);
