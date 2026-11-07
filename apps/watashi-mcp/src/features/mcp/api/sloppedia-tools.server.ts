import {
  Credentials,
  DEFAULT_API_BASE_URL,
  GithubProtocol,
  git,
  pulls,
  repos,
} from "@distilled.cloud/github";
import type { McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Layer, Option, Redacted, Schema, pipe } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { failedAt } from "#/features/mcp/model/upstream-failed";

import type { Caller } from "./caller";
import { ArticleInput } from "./sloppedia-input";
import { articleContent } from "./sloppedia-markdown";
import { sloppediaToken } from "./sloppedia-token.server";
import { NO_PROJECT, WRITE, one, runToolIn, meteredInput } from "./tool-call.server";

type Article = typeof ArticleInput.Type;

const OWNER = "masseater";
const REPO = "masseater.dev";
const BASE = "main";
const SITE = "https://masseater.dev";
const GRAPHQL_URL = "https://api.github.com/graphql";
const USER_AGENT = "watashi-mcp";

const ENABLE_AUTO_MERGE = `mutation ($id: ID!, $headline: String!) {
  enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH, commitHeadline: $headline }) {
    clientMutationId
  }
}`;

const GraphqlErrors = Schema.Array(Schema.Struct({ message: Schema.String }));

const GraphqlResult = Schema.Struct({ errors: Schema.optionalKey(GraphqlErrors) });

const DESCRIPTION = `masseater.devのSloppedia(${SITE}/sloppedia/)に記事を1件足すか、同じslugの記事を書き換える。Sloppediaは持ち主の趣味嗜好が強く出るWikipedia風の個人の百科事典もどきである。百科事典の体裁で、である調で書く。記事の冒頭では記事名を主語にして題材が何であるかを定義し、記事名を太字にしない。事実には出典を付ける。出典は[^webdev]のような名前のラベルの脚注にし、その定義を本文の末尾に置いて、著者と題名のリンクと媒体を書く。番号のラベルは使わない。持ち主の意見は「Sloppediaの持ち主のmasseaterは〜と考えている」のように誰の意見かを書き、AI自身の意見は書かない。長い記事は##と###の見出しで節に分け、比較は表にする。リンクは[語](URL)の形で埋め込み、URLをむき出しで置かない。ほかのSloppediaの記事へは[語](/sloppedia/<slug>)でつなぐ。独立した記事にすべき語は、まだ記事が無くても同じ形でつなぐ。記事の無いリンクは赤字で表示され、そのslugの記事ができると次のデプロイでリンクに変わる。slugは題材の英語名を小文字とハイフンにしたものにし、新しい記事を書くときは、既存の記事がその題材に張っているリンクのslugに合わせる。PRを作ってauto-mergeを有効にするので、mainのverifyとデプロイが通ると公開される。blogを投稿するツールは意図して用意していない。blogは持ち主が推敲してから出すまとまった文章なので、MCPからAIが書けるのはSloppediaだけである。`;

const INPUT_SCHEMA = ArticleInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const githubLayer = Layer.provideMerge(GithubProtocol, FetchHttpClient.layer);

const fail = failedAt("github");

const autoMerge = Effect.fn("autoMerge")(function* autoMerge(
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
  const response = yield* client.execute(request);
  const { errors } = yield* HttpClientResponse.schemaBodyJson(GraphqlResult)(response);
  return errors ?? [];
});

const existingSha = Effect.fn("existingSha")(function* existingSha(path: string) {
  const content = yield* repos.getContent({ owner: OWNER, repo: REPO, path, ref: BASE }).pipe(
    Effect.asSome,
    Effect.catchTag("NotFound", () => Effect.succeed(Option.none<repos.GetContentResponse>())),
  );
  return pipe(
    content,
    Option.filter(
      (found): found is repos.ContentFile => !Arr.isArray(found) && found.type === "file",
    ),
    Option.map((file) => file.sha),
  );
});

const openPull = Effect.fn("openPull")(function* openPull(article: Article) {
  const path = `apps/portfolio/content/sloppedia/${article.slug}.md`;
  const sha = yield* existingSha(path);
  const verb = Option.match(sha, { onNone: () => "add", onSome: () => "update" });
  const branch = `sloppedia/${article.slug}`;
  const title = `docs(sloppedia): ${verb} ${article.slug}`;
  const main = yield* git.getRef({ owner: OWNER, repo: REPO, ref: `heads/${BASE}` });
  yield* git.createRef({
    owner: OWNER,
    repo: REPO,
    ref: `refs/heads/${branch}`,
    sha: main.object.sha,
  });
  yield* repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path,
    message: title,
    content: articleContent(article),
    branch,
    ...Option.match(sha, { onNone: () => ({}), onSome: (value) => ({ sha: value }) }),
  });
  const pull = yield* pulls.create({ owner: OWNER, repo: REPO, title, head: branch, base: BASE });
  return { pull, title };
});

const publish = Effect.fn("publish")(function* publish(token: string, article: Article) {
  const { pull, title } = yield* openPull(article);
  const errors = yield* autoMerge(token, pull, `${title} (#${String(pull.number)})`);
  if (Arr.isReadonlyArrayNonEmpty(errors)) {
    yield* pulls.merge({
      owner: OWNER,
      repo: REPO,
      pull_number: pull.number,
      merge_method: "squash",
    });
  }
  return { pull: pull.html_url, url: `${SITE}/sloppedia/${article.slug}` };
});

const writeArticle = Effect.fn("writeArticle")(function* writeArticle(article: Article) {
  const token = yield* sloppediaToken;
  const credentials = Effect.succeed({
    token: Redacted.make(token),
    apiBaseUrl: DEFAULT_API_BASE_URL,
    userAgent: USER_AGENT,
  });
  return yield* publish(token, article).pipe(
    Effect.provideService(Credentials, credentials),
    Effect.mapError(fail),
  );
});

const runGithubTool = runToolIn(githubLayer);

const registerSloppediaTools =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "write_sloppedia_article",
      {
        description: DESCRIPTION,
        inputSchema: meteredInput({ tool: "write_sloppedia_article", caller, project: NO_PROJECT })(
          INPUT_SCHEMA,
        ),
        annotations: WRITE,
      },
      (input) =>
        writeArticle(input).pipe(
          runGithubTool({
            tool: "write_sloppedia_article",
            caller,
            project: NO_PROJECT,
            input,
            count: one,
          }),
        ),
    );
    return server;
  };

export { registerSloppediaTools };
