import { expect, it } from "@effect/vitest";
import { McpServer } from "@modelcontextprotocol/server";
import { Effect, Schema } from "effect";

import { meteredMcpHandler } from "./metered-handler.ts";
import { encodeJson, one, toolCalls } from "./tool-call.ts";

const taggedError = Schema.TaggedError;

class Missing extends taggedError<Missing, { readonly brand: unique symbol }>()("Missing", {
  key: Schema.String,
}) {}

const { runTool } = toolCalls<Missing>({
  describe: ({ key }) => ({ errorTag: "Missing", text: `${key} was not found` }),
});

const FOUND_KEY = "x";

const USER_AGENT = "agent/1";

const CLIENT = "client-a";

const NO_RESULTS = 0;

const measured = (resultCount: number): readonly unknown[] => [
  expect.any(Number),
  expect.any(Number),
  expect.any(Number),
  resultCount,
];

const Input = Schema.Struct({
  key: Schema.NonEmptyString,
  project: Schema.optional(Schema.String),
});

const INPUT_SCHEMA = Input.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const lookup = (key: string): Effect.Effect<Readonly<{ found: string }>, Missing> =>
  Effect.succeed({ found: key }).pipe(
    Effect.filterOrFail(
      () => key === FOUND_KEY,
      () => Missing.make({ key }),
    ),
  );

const server = (): McpServer => {
  const created = new McpServer({ name: "test", version: "0.0.0" });
  created.registerTool("lookup", { inputSchema: INPUT_SCHEMA }, ({ key }) =>
    lookup(key).pipe(runTool({ count: one })),
  );
  return created;
};

const mcpRequest = (body: string): Request =>
  new Request("https://mcp.example/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "user-agent": USER_AGENT,
    },
    body,
  });

type Called = Readonly<{ text: string; points: readonly AnalyticsEngineDataPoint[] }>;

const pointsOf = (args: Readonly<Record<string, unknown>>): Effect.Effect<Called> =>
  Effect.gen(function* called() {
    const written: AnalyticsEngineDataPoint[] = [];
    const dataset: AnalyticsEngineDataset = {
      writeDataPoint: (point) => {
        written.push({ ...point });
      },
    };
    const body = yield* encodeJson({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "lookup", arguments: args },
    });
    const response = yield* Effect.promise(() =>
      meteredMcpHandler(dataset)(server)(mcpRequest(body), { azp: CLIENT }),
    );
    const text = yield* Effect.promise(() => response.text());
    return { text, points: written };
  });

it.effect("成功した呼び出しを件数つきで 1 件記録する", () =>
  Effect.gen(function* succeeded() {
    const { text, points } = yield* pointsOf({ key: FOUND_KEY, project: "p" });
    expect(text).toContain(String.raw`{\"found\":\"x\"}`);
    expect(points).toMatchObject([
      { blobs: ["lookup", "ok", "", CLIENT, "p", USER_AGENT], doubles: measured(one()) },
    ]);
  }),
);

it.effect("失敗した呼び出しをエラーの _tag つきで記録する", () =>
  Effect.gen(function* failed() {
    const { points } = yield* pointsOf({ key: "y" });
    expect(points).toMatchObject([
      {
        blobs: ["lookup", "error", "Missing", CLIENT, "", USER_AGENT],
        doubles: measured(NO_RESULTS),
      },
    ]);
  }),
);

it.effect("tools/call でない要求は記録しない", () =>
  Effect.gen(function* listed() {
    const written: AnalyticsEngineDataPoint[] = [];
    const dataset: AnalyticsEngineDataset = {
      writeDataPoint: (point) => {
        written.push({ ...point });
      },
    };
    const body = yield* encodeJson({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const response = yield* Effect.promise(() =>
      meteredMcpHandler(dataset)(server)(mcpRequest(body), { azp: CLIENT }),
    );
    expect(response.ok).toBe(true);
    expect(written).toStrictEqual([]);
  }),
);
