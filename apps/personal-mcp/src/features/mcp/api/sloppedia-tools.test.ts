import { expect, it } from "@effect/vitest";
import type { Caller } from "@masseater.dev/mcp-tool-call";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { beforeEach, vi } from "vite-plus/test";

import {
  MAIN_SHA,
  NEW_PULL,
  REPO,
  sentRequests,
  setScene,
  stubGithub,
} from "./sloppedia-tools.test.support.ts";
import type { Sent } from "./sloppedia-tools.test.support.ts";
import { registerTools } from "./tools";

vi.mock("cloudflare:workers", () => import("./sloppedia-tools.test.support.ts"));

stubGithub();

beforeEach(() => {
  setScene({});
});

const CALLER: Caller = { client: "vitest", userAgent: "vitest" };

const BRANCH = "sloppedia/web-dev";

const OPEN_PULL = 7;

const UNAUTHORIZED = 401;

const CONFLICT = 409;

const OK = 200;

const ONCE = 1;

const ARTICLE = {
  slug: "web-dev",
  title: "Web 開発",
  description: "Web の開発である。",
  body: "Web 開発は、Web の開発である。\n",
};

const TextContent = Schema.Struct({ type: Schema.String, text: Schema.String });

const CallResult = Schema.Struct({
  content: Schema.Array(TextContent),
  isError: Schema.optionalKey(Schema.Boolean),
});

const ToolResult = Schema.fromJsonString(Schema.Struct({ result: CallResult }));

const decodeToolResult = Schema.decodeEffect(ToolResult);

const DATA_LINE = /^data: (?<json>.+)$/mu;

const toolCall = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name: "write_sloppedia_article", arguments: ARTICLE },
};

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const writeArticle = Effect.gen(function* writeArticle() {
  const body = yield* encodeJson(toolCall);
  const response = yield* Effect.promise(() =>
    createMcpHandler(() => registerTools(CALLER)).fetch(
      new Request("https://personal-mcp.masseater.dev/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body,
      }),
    ),
  );
  const text = yield* Effect.promise(() => response.text());
  const json = pipe(
    text,
    Str.match(DATA_LINE),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(Rec.get("json")),
    Option.getOrElse(() => text),
  );
  const { result } = yield* decodeToolResult(json);
  return {
    isError: result.isError ?? false,
    text: pipe(
      result.content,
      Arr.map((item) => item.text),
      Arr.join("\n"),
    ),
  };
}).pipe(Effect.orDie);

const sentTo = (method: string, path: string): readonly Sent[] =>
  pipe(
    sentRequests(),
    Arr.filter((request) => request.method === method && request.path === path),
  );

it.effect("新しい記事はブランチと PR を作り、auto-merge を有効にする", () =>
  Effect.gen(function* newArticle() {
    const { isError, text } = yield* writeArticle;
    expect(isError).toBe(false);
    expect(text).toContain(`/pull/${String(NEW_PULL)}`);
    expect(sentTo("POST", `${REPO}/git/refs`)).toStrictEqual([
      {
        method: "POST",
        path: `${REPO}/git/refs`,
        body: { ref: `refs/heads/${BRANCH}`, sha: MAIN_SHA },
      },
    ]);
    expect(sentTo("POST", "/graphql")).toHaveLength(ONCE);
  }),
);

it.effect("auto-merge の HTTP が失敗したら成功と返さず、失敗した手順を返す", () =>
  Effect.gen(function* autoMergeRejected() {
    setScene({ graphql: { status: UNAUTHORIZED, body: { message: "Bad credentials" } } });
    const { isError, text } = yield* writeArticle;
    expect(isError).toBe(true);
    expect(text).toContain("enable auto-merge");
  }),
);

it.effect("GraphQL が auto-merge を断ったら、PR をそのままマージする", () =>
  Effect.gen(function* autoMergeRefused() {
    setScene({
      graphql: { status: OK, body: { errors: [{ message: "Pull request is in clean status" }] } },
    });
    const { isError } = yield* writeArticle;
    expect(isError).toBe(false);
    expect(sentTo("PUT", `${REPO}/pulls/${String(NEW_PULL)}/merge`)).toHaveLength(ONCE);
  }),
);

it.effect(
  "同じ slug のブランチと PR が残っていたら、ブランチを main に合わせ直して PR を使い回す",
  () =>
    Effect.gen(function* branchLeftOver() {
      setScene({ branches: [BRANCH], openPulls: { [BRANCH]: OPEN_PULL } });
      const { isError, text } = yield* writeArticle;
      expect(isError).toBe(false);
      expect(text).toContain(`/pull/${String(OPEN_PULL)}`);
      expect(sentTo("PATCH", `${REPO}/git/refs/heads/${BRANCH}`)).toStrictEqual([
        {
          method: "PATCH",
          path: `${REPO}/git/refs/heads/${BRANCH}`,
          body: { sha: MAIN_SHA, force: true },
        },
      ]);
      expect(sentTo("POST", `${REPO}/pulls`)).toStrictEqual([]);
    }),
);

it.effect("記事の書き込みが失敗したら、失敗した手順を返す", () =>
  Effect.gen(function* commitRejected() {
    setScene({ commit: { status: CONFLICT, body: { message: "sha does not match" } } });
    const { isError, text } = yield* writeArticle;
    expect(isError).toBe(true);
    expect(pipe(text, Str.includes("commit article"))).toBe(true);
    expect(sentTo("POST", `${REPO}/pulls`)).toStrictEqual([]);
  }),
);
