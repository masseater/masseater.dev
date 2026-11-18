import { Array as Arr, Effect, Record, Schema, pipe } from "effect";
import type { Redacted } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

const API = "https://api.cloudflare.com/client/v4/accounts";
const PAGE_SIZE = 100;

type Named = readonly [string, string];

const Databases = Schema.Struct({
  result: Schema.Array(Schema.Struct({ uuid: Schema.String, name: Schema.String })),
});

const Queues = Schema.Struct({
  result: Schema.Array(Schema.Struct({ queue_id: Schema.String, queue_name: Schema.String })),
});

const listed = Effect.fn("cloudflareUsage.list")(function* listed<
  Value extends Schema.Codec<unknown, unknown>,
>({ path, codec, bearer }: Readonly<{ path: string; codec: Value; bearer: Redacted.Redacted }>) {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const request = HttpClientRequest.get(path).pipe(
    HttpClientRequest.setUrlParams({ per_page: String(PAGE_SIZE) }),
    HttpClientRequest.bearerToken(bearer),
  );
  const response = yield* client.execute(request);
  return yield* HttpClientResponse.schemaBodyJson(codec)(response);
});

const readNames = Effect.fn("cloudflareUsage.names")(function* readNames({
  account,
  bearer,
}: Readonly<{ account: string; bearer: Redacted.Redacted }>) {
  const databases = yield* listed({
    path: `${API}/${account}/d1/database`,
    codec: Databases,
    bearer,
  });
  const queues = yield* listed({ path: `${API}/${account}/queues`, codec: Queues, bearer });
  const databaseNames = pipe(
    databases.result,
    Arr.map((database): Named => [database.uuid, database.name]),
  );
  const queueNames = pipe(
    queues.result,
    Arr.map((queue): Named => [queue.queue_id, queue.queue_name]),
  );
  return Record.fromEntries([...databaseNames, ...queueNames]);
});

const namesOrNone = (
  scope: Readonly<{ account: string; bearer: Redacted.Redacted }>,
): Effect.Effect<Readonly<Record<string, string>>, never, HttpClient.HttpClient> =>
  readNames(scope).pipe(Effect.orElseSucceed(() => Record.empty<string, string>()));

/** @internal */
export const resourceNames = namesOrNone;
