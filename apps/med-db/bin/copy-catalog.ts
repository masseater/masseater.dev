import { exportDatabase } from "@alchemy.run/cloudflare/D1/ExportDatabase";
import { importD1Database } from "@alchemy.run/cloudflare/D1/ImportDatabase";
import { CredentialsFromEnv } from "@distilled.cloud/cloudflare/Credentials";
import { queryDatabase } from "@distilled.cloud/cloudflare/d1";
import { runMainWith } from "@masseater.dev/node-main";
import { Array as Arr, Config, Console, Effect, Record as Rec, Schema, Stream, pipe } from "effect";
import { HttpClient } from "effect/http";

const CATALOG_TABLES = [
  "video",
  "song",
  "person",
  "person_alias",
  "song_alias",
  "part",
  "part_staff",
] as const;

const EMPTY = 0;

const COUNTS_SQL = `SELECT ${pipe(
  CATALOG_TABLES,
  Arr.map((table) => `(SELECT count(*) FROM ${table}) AS ${table}`),
  Arr.join(", "),
)}`;

const Counts = Schema.Struct({
  video: Schema.Finite,
  song: Schema.Finite,
  person: Schema.Finite,
  person_alias: Schema.Finite,
  song_alias: Schema.Finite,
  part: Schema.Finite,
  part_staff: Schema.Finite,
});

const CountsPages = Schema.Tuple([Schema.Struct({ results: Schema.Tuple([Counts]) })]);

const decodeCounts = Schema.decodeUnknownEffect(CountsPages);

const encodeCounts = Schema.encodeEffect(Schema.fromJsonString(Counts));

const countRows = Effect.fn("countRows")(function* countRows(
  accountId: string,
  databaseId: string,
) {
  const pages = yield* Stream.runCollect(
    queryDatabase.items({ accountId, databaseId, sql: COUNTS_SQL }),
  );
  const [
    {
      results: [counts],
    },
  ] = yield* decodeCounts(Arr.fromIterable(pages));
  return counts;
});

const isEmpty = (counts: typeof Counts.Type): boolean =>
  Arr.every(Rec.values(counts), (count) => count === EMPTY);

const dumpTable = Effect.fn("dumpTable")(function* dumpTable(
  accountId: string,
  databaseId: string,
  table: string,
) {
  const { signedUrl } = yield* exportDatabase({
    accountId,
    databaseId,
    dumpOptions: { tables: [table], noSchema: true },
  });
  const response = yield* HttpClient.get(signedUrl);
  return yield* response.text;
});

const report = Effect.fn("report")(function* report(
  label: string,
  accountId: string,
  databaseId: string,
) {
  const counts = yield* countRows(accountId, databaseId);
  const json = yield* encodeCounts(counts);
  yield* Console.log(label, json);
});

const taggedError = Schema.TaggedError;

class TargetNotEmpty extends taggedError<TargetNotEmpty, { readonly brand: unique symbol }>()(
  "TargetNotEmpty",
  { databaseId: Schema.String },
) {}

const requireEmpty = (
  accountId: string,
  databaseId: string,
): Effect.Effect<
  typeof Counts.Type,
  Effect.Error<ReturnType<typeof countRows>> | TargetNotEmpty,
  Effect.Services<ReturnType<typeof countRows>>
> =>
  Effect.filterOrFail(countRows(accountId, databaseId), isEmpty, () =>
    TargetNotEmpty.make({ databaseId }),
  );

const copyCatalog = Effect.gen(function* copyCatalog() {
  const accountId = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const source = yield* Config.String("SOURCE_DATABASE_ID");
  const target = yield* Config.String("TARGET_DATABASE_ID");
  yield* requireEmpty(accountId, target);
  const dumps = yield* Effect.forEach(
    CATALOG_TABLES,
    (table) => dumpTable(accountId, source, table),
    { concurrency: 1 },
  );
  const sqlData = Arr.join(dumps, "\n");
  yield* importD1Database({ accountId, databaseId: target, sqlData });
  yield* report("source", accountId, source);
  yield* report("target", accountId, target);
});

runMainWith({ serviceName: "med-db-copy-catalog", services: CredentialsFromEnv })(copyCatalog);
