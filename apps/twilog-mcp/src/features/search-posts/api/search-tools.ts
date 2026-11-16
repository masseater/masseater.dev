import type { Caller, UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { failedAt, NO_PROJECT } from "@masseater.dev/mcp-tool-call";
import type { SiteToken } from "@masseater.dev/repositories/credential-broker.worker";
import { TWILOG_ACCOUNTS, twilogTarget } from "@masseater.dev/repositories/oauth-targets";
import type { TwilogAccount } from "@masseater.dev/repositories/oauth-targets";
import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { Array as Arr, Effect, Match, Number as Num, Option, Schema, pipe } from "effect";

import { meteredInput, runTool } from "#/shared/api/index.ts";

import { SearchInput } from "./search-input.ts";
import type { SearchRequest } from "./search-input.ts";
import type { TwilogPosts } from "./twilog-posts.ts";
import { twilogPosts } from "./twilog-upstream.ts";

type Post = TwilogPosts["logs"][number];

type AccountResult =
  | Readonly<{
      account: TwilogAccount;
      status: "ok";
      page: number;
      maxPage: number;
      posts: readonly Post[];
    }>
  | Readonly<{ account: TwilogAccount; status: "login"; loginUrl: string }>
  | Readonly<{ account: TwilogAccount; status: "wrong_account"; linkedTo: string }>
  | Readonly<{ account: TwilogAccount; status: "failed"; message: string }>;

type SearchResult = Readonly<{ results: readonly AccountResult[] }>;

type AccountSearch = Readonly<{ account: TwilogAccount; request: SearchRequest }>;

const TOOL = "search_posts";

const NO_POSTS = 0;

const DESCRIPTION =
  "Search the owner's X (Twitter) archive on Twilog across all of the owner's linked accounts at once. Each result names its account and carries that account's posts (tweets, likes or bookmarks), page and maxPage. isSelf marks posts the account itself wrote. A result with status login means that account needs the owner to open loginUrl and sign in to Togetter as that account.";

const INPUT_SCHEMA = SearchInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const brokerFailed = failedAt("credential broker");

const brokerToken = (account: TwilogAccount): Effect.Effect<SiteToken, UpstreamFailed> =>
  Effect.tryPromise({
    try: (): Promise<SiteToken> => env.ACCESS_OAUTH.token(twilogTarget(account)),
    catch: brokerFailed,
  });

const linkedAccount = (posts: TwilogPosts): Option.Option<string> =>
  pipe(
    posts.logs,
    Arr.findFirst((post) => post.isSelf),
    Option.map((post) => post.authorId),
  );

const resultOf =
  (account: TwilogAccount) =>
  (posts: TwilogPosts): AccountResult =>
    pipe(
      linkedAccount(posts),
      Option.filter((linkedTo) => linkedTo !== account),
      Option.match({
        onNone: (): AccountResult => ({
          account,
          status: "ok",
          page: posts.meta.page,
          maxPage: posts.meta.maxPage,
          posts: posts.logs,
        }),
        onSome: (linkedTo): AccountResult => ({ account, status: "wrong_account", linkedTo }),
      }),
    );

const withToken =
  ({ account, request }: AccountSearch) =>
  (token: SiteToken): Effect.Effect<AccountResult, UpstreamFailed> =>
    Match.value(token).pipe(
      Match.discriminatorsExhaustive("status")({
        ok: ({ accessToken }) =>
          twilogPosts({ account, accessToken, request }).pipe(Effect.map(resultOf(account))),
        login: ({ loginUrl }) =>
          Effect.succeed<AccountResult>({ account, status: "login", loginUrl }),
        failed: ({ message }) =>
          Effect.succeed<AccountResult>({ account, status: "failed", message }),
      }),
    );

const searchAccount = (search: AccountSearch): Effect.Effect<AccountResult> =>
  brokerToken(search.account).pipe(
    Effect.flatMap(withToken(search)),
    Effect.catchTag("UpstreamFailed", ({ message }) =>
      Effect.succeed<AccountResult>({ account: search.account, status: "failed", message }),
    ),
  );

const search = (request: SearchRequest): Effect.Effect<SearchResult> => {
  const searches = pipe(
    request.accounts ?? TWILOG_ACCOUNTS,
    Arr.dedupe,
    Arr.map((account) => searchAccount({ account, request })),
  );
  return Effect.all(searches, { concurrency: "unbounded" }).pipe(
    Effect.map((results) => ({ results })),
  );
};

const postsIn = (result: AccountResult): number =>
  Match.value(result).pipe(
    Match.discriminator("status")("ok", ({ posts }) => posts.length),
    Match.orElse(() => NO_POSTS),
  );

const postCount = ({ results }: SearchResult): number =>
  pipe(results, Arr.map(postsIn), Num.sumAll);

export const registerSearchTools =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      TOOL,
      {
        description: DESCRIPTION,
        inputSchema: meteredInput({ tool: TOOL, caller, project: NO_PROJECT })(INPUT_SCHEMA),
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      (input) =>
        search(input).pipe(
          runTool({ tool: TOOL, caller, project: NO_PROJECT, input, count: postCount }),
        ),
    );
    return server;
  };
