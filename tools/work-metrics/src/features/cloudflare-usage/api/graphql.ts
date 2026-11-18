import { Array as Arr, Config, Effect, Option, Record, Schema, pipe } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { METERS } from "#/features/cloudflare-usage/model/meters.ts";
import type { Meter } from "#/features/cloudflare-usage/model/meters.ts";
import type { Group } from "#/features/cloudflare-usage/model/usage.ts";

import { resourceNames } from "./names.ts";

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";
const ROW_LIMIT = 10_000;

const aliasOf = (index: number): string => `m${String(index)}`;

const fieldOf = (meter: Meter, index: number): string =>
  `${aliasOf(index)}: ${meter.dataset}(limit: ${String(ROW_LIMIT)}, filter: { date_geq: $since, date_leq: $until }) { sum { value: ${meter.metric} } dimensions { key: ${meter.dimension} } }`;

const QUERY = `query ($account: string!, $since: Date!, $until: Date!) {
  viewer { accounts(filter: { accountTag: $account }) {
    ${pipe(METERS, Arr.map(fieldOf), Arr.join("\n    "))}
  } }
}`;

const Row = Schema.Struct({
  sum: Schema.Struct({ value: Schema.Finite }),
  dimensions: Schema.Struct({ key: Schema.NullOr(Schema.String) }),
});

const Account = Schema.Record(Schema.String, Schema.Array(Row));

const Viewer = Schema.Struct({ accounts: Schema.Array(Account) });

const Result = Schema.Struct({ data: Schema.NullOr(Schema.Struct({ viewer: Viewer })) });

const account = Config.String("CLOUDFLARE_ACCOUNT_ID").pipe(
  Config.orElse(() => Config.String("CF_PERSONAL_ACCOUNT_ID")),
);

const token = Config.Redacted("CLOUDFLARE_API_TOKEN").pipe(
  Config.orElse(() => Config.Redacted("CF_PERSONAL_API_TOKEN")),
);

const groupsOf =
  (names: Readonly<Record<string, string>>) =>
  (rows: Readonly<(typeof Account.Type)[string]>): readonly Group[] =>
    pipe(
      rows,
      Arr.map((row) => {
        const key = row.dimensions.key ?? "";
        return { key: names[key] ?? key, value: row.sum.value };
      }),
    );

const readMeters = Effect.fn("cloudflareUsage.read")(function* readMeters(
  window: Readonly<{ since: string; until: string }>,
) {
  const accountId = yield* account;
  const bearer = yield* token;
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const request = HttpClientRequest.post(GRAPHQL_URL).pipe(
    HttpClientRequest.bearerToken(bearer),
    HttpClientRequest.bodyJsonUnsafe({
      query: QUERY,
      variables: { account: accountId, ...window },
    }),
  );
  const response = yield* client.execute(request);
  const result = yield* HttpClientResponse.schemaBodyJson(Result)(response);
  const names = yield* resourceNames({ account: accountId, bearer });
  const found = yield* pipe(
    Option.fromNullishOr(result.data),
    Option.flatMap((data) => Arr.head(data.viewer.accounts)),
    Effect.fromOption,
  );
  const rowsAt = (index: number): (typeof Account.Type)[string] =>
    Option.getOrElse(Record.get(found, aliasOf(index)), () => []);
  return pipe(
    METERS,
    Arr.map((meter, index) => ({ meter, groups: groupsOf(names)(rowsAt(index)) })),
  );
});

/** @internal */
export const meterGroups = readMeters;
