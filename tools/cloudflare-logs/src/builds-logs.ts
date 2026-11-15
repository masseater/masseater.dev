import { CredentialsFromEnv } from "@distilled.cloud/cloudflare/Credentials";
import { putObject } from "@distilled.cloud/cloudflare/r2";
import { listScripts } from "@distilled.cloud/cloudflare/workers";
import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Config,
  Console,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";

const API = "https://api.cloudflare.com/client/v4/accounts";
const TAB = "\t";
const LINE = "\n";
const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const taggedError = Schema.TaggedError;

class WorkerNotFound extends taggedError<WorkerNotFound, { readonly brand: unique symbol }>()(
  "WorkerNotFound",
  { message: Schema.String },
) {}

const Build = Schema.Struct({
  build_uuid: Schema.String,
  status: Schema.NullOr(Schema.String),
  build_outcome: Schema.NullOr(Schema.String),
  created_on: Schema.NullOr(Schema.String),
  stopped_on: Schema.NullOr(Schema.String),
});

const BuildList = Schema.Struct({ result: Schema.NullOr(Schema.Array(Build)) });

const LogLine = Schema.Array(Schema.Unknown);
const LogLines = Schema.NullOr(Schema.Array(LogLine));
const Cursor = Schema.NullOr(Schema.String);
const Truncated = Schema.NullOr(Schema.Boolean);

const LogPage = Schema.Struct({
  result: Schema.Struct({
    lines: Schema.optional(LogLines),
    cursor: Schema.optional(Cursor),
    truncated: Schema.optional(Truncated),
  }),
});

const decodeLogPage = Schema.decodeUnknownEffect(LogPage);
const decodeBuildList = Schema.decodeUnknownEffect(BuildList);

interface Account {
  readonly accountId: string;
  readonly token: Redacted.Redacted;
}

const getJson = Effect.fn("getJson")(function* getJson(
  { accountId, token }: Account,
  path: string,
) {
  const http = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.get(`${API}/${accountId}/${path}`).pipe(
    HttpClientRequest.bearerToken(Redacted.value(token)),
  );
  const response = yield* HttpClient.filterStatusOk(http).execute(request);
  return yield* response.json;
});

const tagOf = Effect.fn("tagOf")(function* tagOf(accountId: string, worker: string) {
  const scripts = yield* Stream.runCollect(listScripts.items({ accountId }));
  const found = pipe(
    scripts,
    Arr.findFirst((script) => script.id === worker),
    Option.flatMap(({ tag }) => Option.fromNullishOr(tag)),
  );
  if (Option.isNone(found)) {
    return yield* WorkerNotFound.make({ message: `worker ${worker} not found` });
  }
  return found.value;
});

const joinParts = (parts: readonly unknown[]): string =>
  pipe(parts, Arr.map(String), Arr.join(TAB));

const logPage = Effect.fn("logPage")(function* logPage(
  account: Account,
  build: string,
  cursor: Option.Option<string>,
) {
  const query = Option.match(cursor, { onNone: () => "", onSome: (value) => `?cursor=${value}` });
  const body = yield* getJson(account, `builds/builds/${build}/logs${query}`);
  const { result } = yield* decodeLogPage(body);
  const parts = Option.getOrElse(Option.fromNullishOr(result.lines), () => Arr.empty());
  const next = pipe(
    Option.fromNullishOr(result.cursor),
    Option.filter(() => result.truncated === true),
  );
  const lines = pipe(parts, Arr.map(joinParts));
  return [lines, pipe(next, Option.map(Option.some))] as const;
});

const buildLog = Effect.fn("buildLog")(function* buildLog(account: Account, build: string) {
  const pages = yield* Stream.runCollect(
    Stream.paginate(Option.none<string>(), (cursor) => logPage(account, build, cursor)),
  );
  return Arr.join(pages, LINE);
});

const archiveBuild = Effect.fn("archiveBuild")(function* archiveBuild(
  account: Account,
  worker: string,
  build: string,
) {
  const bucketName = yield* Config.String("BUCKET");
  const log = yield* buildLog(account, build);
  yield* putObject({
    accountId: account.accountId,
    bucketName,
    objectName: `workers-builds/${worker}/${build}.log`,
    body: log,
    contentType: "text/plain",
  });
  const lines = Str.split(LINE)(log).length;
  yield* Console.log(`${build} lines=${String(lines)}`);
});

const printBuild = (build: typeof Build.Type): Effect.Effect<void, Schema.SchemaError> =>
  encodeJson(build).pipe(Effect.flatMap(Console.log));

const buildsOf = Effect.fn("buildsOf")(function* buildsOf(account: Account, tag: string) {
  const count = yield* Config.Number("COUNT");
  const body = yield* getJson(account, `builds/workers/${tag}/builds?per_page=${String(count)}`);
  const { result } = yield* decodeBuildList(body);
  return Option.getOrElse(Option.fromNullishOr(result), () => Arr.empty());
});

const buildsLogs = Effect.gen(function* buildsLogs() {
  const accountId = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const token = yield* Config.Redacted("CLOUDFLARE_API_TOKEN");
  const worker = yield* Config.String("WORKER");
  const account = { accountId, token };
  const tag = yield* tagOf(accountId, worker);
  const builds = yield* buildsOf(account, tag);
  yield* Effect.forEach(builds, (build) => printBuild(build), { discard: true });
  yield* Effect.forEach(builds, (build) => archiveBuild(account, worker, build.build_uuid), {
    discard: true,
  });
});

const services = CredentialsFromEnv.pipe(Layer.provideMerge(FetchHttpClient.layer));

runMain("builds-logs")(
  Layer.build(services).pipe(
    Effect.flatMap((context) => Effect.provideContext(buildsLogs, context)),
    Effect.scoped,
  ),
);
