import {
  Credentials,
  DEFAULT_API_BASE_URL,
  GithubProtocol,
  git,
  pulls,
  repos,
} from "@distilled.cloud/github";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { failedAt, one, WRITE, toolInputOf } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Layer, Option, Redacted, Schema, pipe } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { runToolIn } from "#/shared/api/index.ts";

import { ArticleInput } from "./sloppedia-input.ts";
import { articleContent } from "./sloppedia-markdown.ts";
import { sloppediaToken } from "./sloppedia-token.ts";
import type { SloppediaBroker } from "./sloppedia-token.ts";

type Article = typeof ArticleInput.Type;

type Pull = Readonly<{ node_id: string; number: number; html_url: string }>;

const OWNER = "masseater";
const REPO = "masseater.dev";
const BASE = "main";
const SITE = "https://masseater.dev";
const GRAPHQL_URL = "https://api.github.com/graphql";
const USER_AGENT = "sundries";

const ENABLE_AUTO_MERGE = `mutation ($id: ID!, $headline: String!) {
  enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH, commitHeadline: $headline }) {
    clientMutationId
  }
}`;

const GraphqlErrors = Schema.Array(Schema.Struct({ message: Schema.String }));

const GraphqlResult = Schema.Struct({ errors: Schema.optionalKey(GraphqlErrors) });

const DESCRIPTION = `Add or rewrite an article in Sloppedia (${SITE}/sloppedia/), the owner's opinionated Wikipedia-like encyclopedia.`;

const INPUT_SCHEMA = toolInputOf(ArticleInput);

const githubLayer = Layer.provideMerge(GithubProtocol, FetchHttpClient.layer);

const failedStep = (step: string): ((cause: unknown) => UpstreamFailed) =>
  failedAt(`github (${step})`);

const pullOf = ({ node_id, number, html_url }: Pull): Pull => ({ node_id, number, html_url });

const autoMerge = Effect.fn("autoMerge")(
  function* autoMerge(
    token: string,
    pull: Readonly<{ node_id: string; number: number }>,
    headline: string,
  ) {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.post(GRAPHQL_URL).pipe(
      HttpClientRequest.bearerToken(token),
      HttpClientRequest.setHeader("user-agent", USER_AGENT),
      HttpClientRequest.bodyJsonUnsafe({
        query: ENABLE_AUTO_MERGE,
        variables: { id: pull.node_id, headline },
      }),
    );
    const response = yield* client
      .execute(request)
      .pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
    const { errors } = yield* HttpClientResponse.schemaBodyJson(GraphqlResult)(response);
    return errors ?? [];
  },
  Effect.mapError(failedStep("enable auto-merge")),
);

const existingSha = Effect.fn("existingSha")(function* existingSha(path: string) {
  const content = yield* repos.getContent({ owner: OWNER, repo: REPO, path, ref: BASE }).pipe(
    Effect.asSome,
    Effect.catchTag("NotFound", () => Effect.succeed(Option.none<repos.GetContentResponse>())),
    Effect.mapError(failedStep("read article")),
  );
  return pipe(
    content,
    Option.filter(
      (found): found is repos.ContentFile => !Arr.isArray(found) && found.type === "file",
    ),
    Option.map((file) => file.sha),
  );
});

const pointBranch = Effect.fn("pointBranch")(function* pointBranch(branch: string, sha: string) {
  const ref = `heads/${branch}`;
  const existing = yield* git.getRef({ owner: OWNER, repo: REPO, ref }).pipe(
    Effect.asSome,
    Effect.catchTag("NotFound", () => Effect.succeed(Option.none<git.GitRef>())),
    Effect.mapError(failedStep("read branch")),
  );
  yield* Option.match(existing, {
    onNone: () =>
      git
        .createRef({ owner: OWNER, repo: REPO, ref: `refs/${ref}`, sha })
        .pipe(Effect.mapError(failedStep("create branch"))),
    onSome: () =>
      git
        .updateRef({ owner: OWNER, repo: REPO, ref, sha, force: true })
        .pipe(Effect.mapError(failedStep("reset branch"))),
  });
});

const pullFor = Effect.fn("pullFor")(function* pullFor(branch: string, title: string) {
  const open = yield* pulls
    .list({ owner: OWNER, repo: REPO, head: `${OWNER}:${branch}`, base: BASE, state: "open" })
    .pipe(Effect.mapError(failedStep("find pull request")));
  return yield* Option.match(Arr.head(open), {
    onSome: (pull) => Effect.succeed(pullOf(pull)),
    onNone: () =>
      pulls
        .create({ owner: OWNER, repo: REPO, title, head: branch, base: BASE })
        .pipe(Effect.mapBoth({ onSuccess: pullOf, onFailure: failedStep("open pull request") })),
  });
});

const openPull = Effect.fn("openPull")(function* openPull(article: Article) {
  const path = `apps/portfolio/content/sloppedia/${article.slug}.md`;
  const main = yield* git
    .getRef({ owner: OWNER, repo: REPO, ref: `heads/${BASE}` })
    .pipe(Effect.mapError(failedStep("read main")));
  const sha = yield* existingSha(path);
  const verb = Option.match(sha, { onNone: () => "add", onSome: () => "update" });
  const branch = `sloppedia/${article.slug}`;
  const title = `docs(sloppedia): ${verb} ${article.slug}`;
  yield* pointBranch(branch, main.object.sha);
  yield* repos
    .createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: title,
      content: articleContent(article),
      branch,
      ...Option.match(sha, { onNone: () => ({}), onSome: (value) => ({ sha: value }) }),
    })
    .pipe(Effect.mapError(failedStep("commit article")));
  const pull = yield* pullFor(branch, title);
  return { pull, title };
});

const publish = Effect.fn("publish")(function* publish(token: string, article: Article) {
  const { pull, title } = yield* openPull(article);
  const errors = yield* autoMerge(token, pull, `${title} (#${String(pull.number)})`);
  if (Arr.isReadonlyArrayNonEmpty(errors)) {
    yield* pulls
      .merge({ owner: OWNER, repo: REPO, pull_number: pull.number, merge_method: "squash" })
      .pipe(Effect.mapError(failedStep("merge pull request")));
  }
  return { pull: pull.html_url, url: `${SITE}/sloppedia/${article.slug}` };
});

const writeArticle = Effect.fn("writeArticle")(function* writeArticle(
  broker: SloppediaBroker,
  article: Article,
) {
  const token = yield* sloppediaToken(broker);
  const credentials = Effect.succeed({
    token: Redacted.make(token),
    apiBaseUrl: DEFAULT_API_BASE_URL,
    userAgent: USER_AGENT,
  });
  return yield* publish(token, article).pipe(Effect.provideService(Credentials, credentials));
});

const runGithubTool = runToolIn(githubLayer);

export const registerSloppediaTools =
  (broker: SloppediaBroker) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "write_sloppedia_article",
      {
        description: DESCRIPTION,
        inputSchema: INPUT_SCHEMA,
        annotations: WRITE,
      },
      (input) => writeArticle(broker, input).pipe(runGithubTool({ count: one })),
    );
    return server;
  };
