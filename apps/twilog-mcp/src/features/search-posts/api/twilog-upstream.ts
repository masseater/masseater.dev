import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { targetOf, twilogTarget } from "@masseater.dev/repositories/oauth-targets";
import type { TwilogAccount } from "@masseater.dev/repositories/oauth-targets";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { ContentBlock, TextContent } from "@modelcontextprotocol/client";
import { Array as Arr, Effect, Option, Record as Rec, Schema, pipe } from "effect";

import { SERVER_NAME } from "#/shared/config/index.ts";

import type { SearchRequest } from "./search-input";
import { PostsJson } from "./twilog-posts";
import type { TwilogPosts } from "./twilog-posts";

export type PostsRequest = Readonly<{
  account: TwilogAccount;
  accessToken: string;
  request: SearchRequest;
}>;

type Field = Exclude<keyof SearchRequest, "accounts">;

type ArgumentValue = string | number | boolean;

type ArgumentEntry = readonly [string, ArgumentValue];

const TOOL = "get_twitter_posts";

const CLIENT_INFO = { name: SERVER_NAME, version: "0.0.0" };

const ARGUMENT_NAMES = {
  keyword: "keyword",
  timeline: "timeline_filter",
  page: "page",
  startDate: "startDate",
  endDate: "endDate",
  includeRetweets: "include_retweet",
} as const satisfies Readonly<Record<Field, string>>;

const fail = failedAt("twilog-mcp");

const argumentOf =
  (request: SearchRequest) =>
  ([field, name]: readonly [Field, string]): readonly ArgumentEntry[] =>
    pipe(
      Option.fromNullishOr(request[field]),
      Option.match({ onNone: () => [], onSome: (value) => [[name, value] as const] }),
    );

const upstreamArguments = (request: SearchRequest): Readonly<Record<string, ArgumentValue>> =>
  pipe(Rec.toEntries(ARGUMENT_NAMES), Arr.flatMap(argumentOf(request)), Rec.fromEntries);

type ToolResult = Readonly<{ content: readonly ContentBlock[]; isError?: boolean | undefined }>;

const isText = (block: ContentBlock): block is TextContent => block.type === "text";

const textOf = (content: readonly ContentBlock[]): string =>
  pipe(
    content,
    Arr.filter(isText),
    Arr.map((block) => block.text),
    Arr.join("\n"),
  );

const endpointOf = (account: TwilogAccount): URL => {
  const { resource } = targetOf(twilogTarget(account));
  return new URL(resource);
};

const transportOf = ({ account, accessToken }: PostsRequest): StreamableHTTPClientTransport =>
  new StreamableHTTPClientTransport(endpointOf(account), {
    authProvider: { token: () => Promise.resolve(accessToken) },
  });

const connected = (posts: PostsRequest): Effect.Effect<Client, UpstreamFailed> =>
  Effect.gen(function* connect() {
    const client = new Client(CLIENT_INFO);
    yield* Effect.tryPromise({ try: () => client.connect(transportOf(posts)), catch: fail });
    return client;
  });

const called = (
  client: Client,
  request: SearchRequest,
): Effect.Effect<ToolResult, UpstreamFailed> =>
  Effect.tryPromise({
    try: () => client.callTool({ name: TOOL, arguments: upstreamArguments(request) }),
    catch: fail,
  });

const postsOf = ({ content, isError }: ToolResult): Effect.Effect<TwilogPosts, UpstreamFailed> => {
  const text = textOf(content);
  if (isError === true) {
    return Effect.fail(fail(new Error(text)));
  }
  return Schema.decodeEffect(PostsJson)(text).pipe(Effect.mapError(fail));
};

export const twilogPosts = (posts: PostsRequest): Effect.Effect<TwilogPosts, UpstreamFailed> =>
  Effect.acquireUseRelease(
    connected(posts),
    (client) => called(client, posts.request),
    (client) => Effect.promise(() => client.close()),
  ).pipe(Effect.flatMap(postsOf));
