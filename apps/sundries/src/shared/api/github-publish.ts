import {
  Credentials,
  DEFAULT_API_BASE_URL,
  GithubProtocol,
  git,
  pulls,
  repos,
} from "@distilled.cloud/github";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { WRITE, failedAt, one } from "@masseater.dev/mcp-tool-call";
import type { McpServer, StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Layer, Option, Redacted, Schema, pipe } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { brokerFailed, brokerResponse } from "./broker-response.ts";
import { runToolIn } from "./tool-call.ts";

export type ContentBroker = Readonly<{ fetch: (url: string) => Promise<Response> }>;

export type PublishVerb = "add" | "update";

export type Publication = Readonly<{
  path: string;
  branch: string;
  title: (verb: PublishVerb) => string;
  content: string;
}>;

export type PublishTool<Encoded, Decoded> = Readonly<{
  broker: ContentBroker;
  name: string;
  description: string;
  schema: StandardSchemaWithJSON<Encoded, Decoded>;
  publication: (input: Decoded) => Effect.Effect<Publication>;
  url: (input: Decoded) => string;
}>;

type Pull = Readonly<{ node_id: string; number: number; html_url: string }>;

const OWNER = "masseater";
const REPO = "masseater.dev";
const BASE = "main";
const BROKER_URL = "https://credentials.masseater.dev/";
const GRAPHQL_URL = "https://api.github.com/graphql";
const USER_AGENT = "sundries";

const ENABLE_AUTO_MERGE = `mutation ($id: ID!, $headline: String!) {
  enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH, commitHeadline: $headline }) {
    clientMutationId
  }
}`;

const GraphqlErrors = Schema.Array(Schema.Struct({ message: Schema.String }));

const GraphqlResult = Schema.Struct({ errors: Schema.optionalKey(GraphqlErrors) });

const githubLayer = Layer.provideMerge(GithubProtocol, FetchHttpClient.layer);

const failedStep = (step: string): ((cause: unknown) => UpstreamFailed) =>
  failedAt(`github (${step})`);

const pullOf = ({ node_id, number, html_url }: Pull): Pull => ({ node_id, number, html_url });

const contentToken = (broker: ContentBroker): Effect.Effect<string, UpstreamFailed> =>
  brokerResponse(() => broker.fetch(BROKER_URL)).pipe(
    Effect.flatMap((response) =>
      Effect.tryPromise({ try: () => response.text(), catch: brokerFailed }),
    ),
  );

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
    Effect.mapError(failedStep("read file")),
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

const openPull = Effect.fn("openPull")(function* openPull({
  path,
  branch,
  title: titleOf,
  content,
}: Publication) {
  const main = yield* git
    .getRef({ owner: OWNER, repo: REPO, ref: `heads/${BASE}` })
    .pipe(Effect.mapError(failedStep("read main")));
  const sha = yield* existingSha(path);
  const title = titleOf(Option.match(sha, { onNone: () => "add", onSome: () => "update" }));
  yield* pointBranch(branch, main.object.sha);
  yield* repos
    .createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: title,
      content,
      branch,
      ...Option.match(sha, { onNone: () => ({}), onSome: (value) => ({ sha: value }) }),
    })
    .pipe(Effect.mapError(failedStep("commit file")));
  const pull = yield* pullFor(branch, title);
  return { pull, title };
});

const publish = Effect.fn("publish")(function* publish(token: string, publication: Publication) {
  const { pull, title } = yield* openPull(publication);
  const errors = yield* autoMerge(token, pull, `${title} (#${String(pull.number)})`);
  if (Arr.isReadonlyArrayNonEmpty(errors)) {
    yield* pulls
      .merge({ owner: OWNER, repo: REPO, pull_number: pull.number, merge_method: "squash" })
      .pipe(Effect.mapError(failedStep("merge pull request")));
  }
  return pull.html_url;
});

const credentialsOf = (token: string): Credentials["Service"] =>
  Effect.succeed({
    token: Redacted.make(token),
    apiBaseUrl: DEFAULT_API_BASE_URL,
    userAgent: USER_AGENT,
  });

const publishFile = (
  broker: ContentBroker,
  publication: Publication,
): Effect.Effect<string, UpstreamFailed, HttpClient.HttpClient> =>
  contentToken(broker).pipe(
    Effect.flatMap((token) =>
      publish(token, publication).pipe(Effect.provideService(Credentials, credentialsOf(token))),
    ),
  );

const runGithubTool = runToolIn(githubLayer);

export const registerPublishTool =
  <Encoded, Decoded>(tool: PublishTool<Encoded, Decoded>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
        annotations: WRITE,
      },
      (input) =>
        tool.publication(input).pipe(
          Effect.flatMap((publication) => publishFile(tool.broker, publication)),
          Effect.map((pull) => ({ pull, url: tool.url(input) })),
          runGithubTool({ count: one }),
        ),
    );
    return server;
  };
