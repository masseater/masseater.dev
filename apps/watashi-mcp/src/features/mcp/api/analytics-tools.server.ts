import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { Array as Arr, DateTime, Effect, Option, Schema, String as Str, pipe } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { UpstreamFailed, failedAt } from "#/features/mcp/model/upstream-failed";

import { AnalyticsInput, DEFAULT_DAYS } from "./analytics-input";
import type { Caller } from "./caller";
import { NO_PROJECT, READ_ONLY, runToolIn, meteredInput } from "./tool-call.server";

type Query = Readonly<{ path: Option.Option<string>; days: number }>;

type GroupQuery = Readonly<{ alias: string; order: string; filter: string; label: string }>;

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";
const TOKEN_URL = "https://web-analytics-token/";
const HOST = "masseater.dev";
const ROW_LIMIT = 100;
const DIRECT = "(direct)";
const FILTER_TYPE = "[RumPageloadEventsAdaptiveGroupsFilter_InputObject!]!";

const DESCRIPTION =
  "masseater.devのアクセス解析（Cloudflare Web Analytics）を読む。指定した日数のページビューと訪問数を、パス別に返す。pathを渡すと、そのパスの日別・参照元・国別も返す。パス別は Cloudflare のサンプリングで丸められ、パスを絞った表は1件単位で出る。持ち主だけが読める数字なので、公開される場所へ書き写さない。";

const INPUT_SCHEMA = AnalyticsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const groups = ({ alias, order, filter, label }: GroupQuery): string =>
  `${alias}: rumPageloadEventsAdaptiveGroups(limit: ${String(ROW_LIMIT)}, orderBy: [${order}], filter: { AND: ${filter} }) { count sum { visits } dimensions { label: ${label} } }`;

const REPORT = `query ($account: string!, $site: ${FILTER_TYPE}, $page: ${FILTER_TYPE}) {
  viewer { accounts(filter: { accountTag: $account }) {
    ${groups({ alias: "path", order: "count_DESC", filter: "$site", label: "requestPath" })}
    ${groups({ alias: "day", order: "date_ASC", filter: "$page", label: "date" })}
    ${groups({ alias: "referer", order: "count_DESC", filter: "$page", label: "refererHost" })}
    ${groups({ alias: "country", order: "count_DESC", filter: "$page", label: "countryName" })}
  } }
}`;

const Group = Schema.Struct({
  count: Schema.Finite,
  sum: Schema.Struct({ visits: Schema.Finite }),
  dimensions: Schema.Struct({ label: Schema.String }),
});

const Groups = Schema.Array(Group);

const Account = Schema.Struct({ path: Groups, day: Groups, referer: Groups, country: Groups });

const Viewer = Schema.Struct({ accounts: Schema.Array(Account) });

const Data = Schema.Struct({ viewer: Viewer });

const GraphqlErrors = Schema.NullOr(Schema.Array(Schema.Struct({ message: Schema.String })));

const GraphqlResult = Schema.Struct({
  data: Schema.NullOr(Data),
  errors: Schema.optionalKey(GraphqlErrors),
});

const fail = failedAt("cloudflare web analytics");

const labelOf = (label: string): string =>
  Option.getOrElse(Option.liftPredicate(label, Str.isNonEmpty), () => DIRECT);

const rows = (
  groupRows: typeof Groups.Type,
): readonly Readonly<Record<string, string | number>>[] =>
  pipe(
    groupRows,
    Arr.map((row) => ({
      label: labelOf(row.dimensions.label),
      pageViews: row.count,
      visits: row.sum.visits,
    })),
  );

const windowOf = Effect.fn("windowOf")(function* windowOf(days: number) {
  const until = yield* DateTime.now;
  return {
    datetime_geq: DateTime.formatIso(DateTime.subtract(until, { days })),
    datetime_leq: DateTime.formatIso(until),
  };
});

const fetchToken = Effect.tryPromise({
  try: () => env.WEB_ANALYTICS_TOKEN.fetch(TOKEN_URL),
  catch: fail,
}).pipe(
  Effect.flatMap((response) => Effect.tryPromise({ try: () => response.text(), catch: fail })),
);

const messagesOf = (errors: typeof GraphqlErrors.Type | undefined): string =>
  pipe(
    errors ?? [],
    Arr.map((issue) => issue.message),
    Arr.join("; "),
  );

const readReport = Effect.fn("readReport")(function* readReport(query: Query) {
  const window = yield* windowOf(query.days);
  const site = [{ requestHost: HOST }, window];
  const page = Option.match(query.path, {
    onNone: () => site,
    onSome: (requestPath) => [...site, { requestPath }],
  });
  const token = yield* fetchToken;
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.post(GRAPHQL_URL).pipe(
    HttpClientRequest.bearerToken(token),
    HttpClientRequest.bodyJsonUnsafe({
      query: REPORT,
      variables: { account: env.CLOUDFLARE_ACCOUNT_ID, site, page },
    }),
  );
  const { data, errors } = yield* client
    .execute(request)
    .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(GraphqlResult)), Effect.mapError(fail));
  const account = yield* pipe(
    Option.fromNullishOr(data),
    Option.flatMap((found) => Arr.head(found.viewer.accounts)),
    Effect.fromOption,
    Effect.mapError(() =>
      UpstreamFailed.make({ service: "cloudflare web analytics", message: messagesOf(errors) }),
    ),
  );
  return {
    window,
    path: Option.getOrNull(query.path),
    byPath: rows(account.path),
    byDay: rows(account.day),
    referer: rows(account.referer),
    country: rows(account.country),
  };
});

const runHttpTool = runToolIn(FetchHttpClient.layer);

const registerAnalyticsTools =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "read_web_analytics",
      {
        description: DESCRIPTION,
        inputSchema: meteredInput({ tool: "read_web_analytics", caller, project: NO_PROJECT })(
          INPUT_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        readReport({
          path: Option.fromNullishOr(input.path),
          days: input.days ?? DEFAULT_DAYS,
        }).pipe(
          runHttpTool({
            tool: "read_web_analytics",
            caller,
            project: NO_PROJECT,
            input,
            count: (report) => report.byPath.length,
          }),
        ),
    );
    return server;
  };

export { registerAnalyticsTools };
