import { expect, it } from "@effect/vitest";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import type { CallToolResult, ContentBlock, TextContent } from "@modelcontextprotocol/client";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";
import { afterEach, vi } from "vite-plus/test";

import { PostsJson } from "#/features/search-posts/index.test.support.ts";

import { TOKENS, tokens } from "./search-tools.test.support.ts";
import { registerTools } from "./tools.ts";

vi.mock("cloudflare:workers", () => import("./search-tools.test.support.ts"));

const TWILOG_MCP = "https://twilog-mcp.togetter.dev/mcp";
const UNAUTHORIZED = 401;

const SELF_OF: Readonly<Record<string, string>> = {
  "Bearer token-r_masseater": "r_masseater",
  "Bearer token-u1_mas": "u1_mas",
  "Bearer token-wrong": "r_masseater",
};

const UpstreamInput = Schema.Struct({
  keyword: Schema.optionalKey(Schema.String),
  timeline_filter: Schema.optionalKey(Schema.String),
  page: Schema.optionalKey(Schema.Finite),
});

const received: { current: readonly unknown[] } = { current: [] };

const postsBy = (self: string, keyword: string): Effect.Effect<string> =>
  Schema.encodeEffect(PostsJson)({
    logs: [
      {
        authorId: self,
        authorName: self,
        content: `${keyword} by ${self}`,
        contentUrl: `https://x.com/${self}/status/1`,
        images: [],
        createdAt: "2026-11-14T15:04:15.000000Z",
        type: 1,
        isSelf: true,
      },
      {
        authorId: "someone",
        authorName: "someone",
        content: "followed",
        contentUrl: "https://x.com/someone/status/2",
        images: [],
        createdAt: "2026-11-14T15:00:00.000000Z",
        type: 1,
        isSelf: false,
      },
    ],
    meta: { page: 1, maxPage: 3 },
  }).pipe(Effect.orDie);

const fakeTwilog = (self: string): McpServer => {
  const server = new McpServer({ name: "twilog", version: "0.0.0" });
  server.registerTool(
    "get_twitter_posts",
    {
      inputSchema: UpstreamInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
    },
    (input) => {
      received.current = [...received.current, input];
      return Effect.runPromise(
        postsBy(self, input.keyword ?? "").pipe(
          Effect.map((text) => ({ content: [{ type: "text" as const, text }] })),
        ),
      );
    },
  );
  return server;
};

const upstream: typeof fetch = (input, init) => {
  const request = new Request(input, init);
  const self = Option.fromNullishOr(SELF_OF[request.headers.get("authorization") ?? ""]);
  if (!Str.startsWith(TWILOG_MCP)(request.url) || Option.isNone(self)) {
    return Promise.resolve(new Response("Unauthorized", { status: UNAUTHORIZED }));
  }
  return createMcpHandler(() => fakeTwilog(self.value)).fetch(request);
};

afterEach(() => {
  vi.unstubAllGlobals();
  tokens.current = TOKENS;
  received.current = [];
});

const OptionalString = Schema.optionalKey(Schema.String);

const Posted = Schema.Struct({ content: Schema.String });

const AccountResult = Schema.Struct({
  account: Schema.String,
  status: Schema.String,
  loginUrl: OptionalString,
  linkedTo: OptionalString,
  maxPage: Schema.optionalKey(Schema.Finite),
  posts: Schema.optionalKey(Schema.Array(Posted)),
});

const Result = Schema.Struct({ results: Schema.Array(AccountResult) });

const isText = (block: ContentBlock): block is TextContent => block.type === "text";

const textOf = (content: readonly ContentBlock[]): string =>
  pipe(
    content,
    Arr.filter(isText),
    Arr.map((block) => block.text),
    Arr.join(""),
  );

const callSearch = (
  client: Client,
  args: Readonly<Record<string, unknown>>,
): Promise<CallToolResult> => client.callTool({ name: "search_posts", arguments: args });

const search = (args: Readonly<Record<string, unknown>>): Effect.Effect<typeof Result.Type> =>
  Effect.gen(function* searched() {
    vi.stubGlobal("fetch", upstream);
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const server = registerTools({ client: "vitest", userAgent: "vitest" });
    const client = new Client({ name: "vitest", version: "0.0.0" });
    yield* Effect.promise(() => server.connect(serverSide));
    yield* Effect.promise(() => client.connect(clientSide));
    const called = yield* Effect.promise(() => callSearch(client, args));
    yield* Effect.promise(() => client.close());
    return yield* Schema.decodeEffect(Schema.fromJsonString(Result))(textOf(called.content)).pipe(
      Effect.orDie,
    );
  });

const statuses = (results: (typeof Result.Type)["results"]): readonly (readonly string[])[] =>
  pipe(
    results,
    Arr.map((result) => [result.account, result.status]),
  );

it.effect(
  "アカウントを省くと全アカウントを検索し、ログインの要るアカウントには loginUrl を返す",
  () =>
    Effect.gen(function* everyAccount() {
      const { results } = yield* search({ keyword: "AI" });
      expect(results).toStrictEqual([
        {
          account: "r_masseater",
          status: "ok",
          maxPage: 3,
          posts: [{ content: "AI by r_masseater" }, { content: "followed" }],
        },
        {
          account: "u1_mas",
          status: "login",
          loginUrl: "https://credentials.masseater.dev/access-oauth/login?site=twilog%2Fu1_mas",
        },
      ]);
    }),
);

it.effect("各アカウントのトークンで twilog-mcp を呼び、引数を upstream の名前に直して渡す", () =>
  Effect.gen(function* bothAccounts() {
    tokens.current = {
      ...TOKENS,
      "twilog/u1_mas": {
        status: "ok",
        site: "twilog/u1_mas",
        accessToken: "token-u1_mas",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
    };
    const { results } = yield* search({ keyword: "AI", timeline: "likes", page: 2 });
    expect(statuses(results)).toStrictEqual([
      ["r_masseater", "ok"],
      ["u1_mas", "ok"],
    ]);
    expect(received.current).toStrictEqual([
      { keyword: "AI", timeline_filter: "likes", page: 2 },
      { keyword: "AI", timeline_filter: "likes", page: 2 },
    ]);
  }),
);

it.effect("指定したアカウントだけを検索する", () =>
  Effect.gen(function* oneAccount() {
    const { results } = yield* search({ accounts: ["r_masseater"] });
    expect(statuses(results)).toStrictEqual([["r_masseater", "ok"]]);
  }),
);

it.effect("別のアカウントでログインしたトークンは wrong_account として使わない", () =>
  Effect.gen(function* wrongAccount() {
    tokens.current = {
      ...TOKENS,
      "twilog/u1_mas": {
        status: "ok",
        site: "twilog/u1_mas",
        accessToken: "token-wrong",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
    };
    const { results } = yield* search({ accounts: ["u1_mas"] });
    expect(results).toStrictEqual([
      { account: "u1_mas", status: "wrong_account", linkedTo: "r_masseater" },
    ]);
  }),
);

it.effect(
  "twilog-mcp がトークンを断ったアカウントは failed として返し、ほかのアカウントは返す",
  () =>
    Effect.gen(function* rejected() {
      tokens.current = {
        ...TOKENS,
        "twilog/u1_mas": {
          status: "ok",
          site: "twilog/u1_mas",
          accessToken: "token-revoked",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      };
      const { results } = yield* search({});
      expect(statuses(results)).toStrictEqual([
        ["r_masseater", "ok"],
        ["u1_mas", "failed"],
      ]);
    }),
);
