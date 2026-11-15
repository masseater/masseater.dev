import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Config,
  Console,
  Effect,
  FileSystem,
  Option,
  Path,
  Predicate,
  Redacted,
  Schema,
  pipe,
} from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const BROKER = "https://credentials.masseater.dev/";
const AUDIENCE = "masseater-dev-credential-broker";
const TARBALL = "package.tgz";
const SUCCESS = 0;

const taggedError = Schema.TaggedError;

class PublishFailed extends taggedError<PublishFailed, { readonly brand: unique symbol }>()(
  "PublishFailed",
  { message: Schema.String },
) {}

const Manifest = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  "size-limit": Schema.optional(Schema.Unknown),
});
const IdToken = Schema.Struct({ value: Schema.String });
const Grants = Schema.Struct({ npmToken: Schema.optional(Schema.String) });

const manifestOf = Effect.fn("manifest")(function* manifestOf() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString("package.json");
  return yield* Schema.decodeEffect(Schema.fromJsonString(Manifest))(text);
});

const NO_ENV: Readonly<Record<string, string>> = {};

const exitCodeOf = Effect.fn("exitCode")(function* exitCodeOf(
  name: string,
  args: readonly string[],
  env: Readonly<Record<string, string>> = NO_ENV,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(
    ChildProcess.make(name, [...args], {
      stdout: "inherit",
      stderr: "inherit",
      env: { ...env },
      extendEnv: true,
    }),
  );
  return Number(exitCode);
});

const runOrFail = Effect.fn("run")(function* runOrFail(
  name: string,
  args: readonly string[],
  env: Readonly<Record<string, string>> = NO_ENV,
) {
  const exitCode = yield* exitCodeOf(name, args, env);
  if (exitCode !== SUCCESS) {
    return yield* PublishFailed.make({
      message: `${name} ${pipe(args, Arr.join(" "))} exited with ${String(exitCode)}`,
    });
  }
  return exitCode;
});

const mask = (value: string): Effect.Effect<void> => Console.log(`::add-mask::${value}`);

const oidcToken = Effect.fn("oidc")(function* oidcToken(
  requestUrl: string,
  requestToken: Redacted.Redacted,
) {
  const client = yield* HttpClient.HttpClient;
  const bearer = Redacted.value(requestToken);
  const request = HttpClientRequest.get(`${requestUrl}&audience=${AUDIENCE}`).pipe(
    HttpClientRequest.bearerToken(bearer),
  );
  const response = yield* HttpClient.filterStatusOk(client).execute(request);
  const { value } = yield* HttpClientResponse.schemaBodyJson(IdToken)(response);
  yield* mask(value);
  return value;
});

const brokerToken = Effect.fn("broker.npmToken")(function* brokerToken(oidc: string) {
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.post(BROKER).pipe(HttpClientRequest.bearerToken(oidc));
  const response = yield* HttpClient.filterStatusOk(client).execute(request);
  const grants = yield* HttpClientResponse.schemaBodyJson(Grants)(response);
  const token = Option.fromUndefinedOr(grants.npmToken);
  yield* Effect.forEach(Option.toArray(token), mask);
  return token;
});

const npmToken = Effect.fn("npmToken")(function* npmToken() {
  const requestUrl = yield* Config.option(Config.String("ACTIONS_ID_TOKEN_REQUEST_URL"));
  const requestToken = yield* Config.option(Config.Redacted("ACTIONS_ID_TOKEN_REQUEST_TOKEN"));
  if (Option.isNone(requestUrl) || Option.isNone(requestToken)) {
    return Option.none<string>();
  }
  const oidc = yield* oidcToken(requestUrl.value, requestToken.value);
  return yield* brokerToken(oidc);
});

const pack = Effect.fn("pack")(function* pack() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fileSystem.makeTempDirectoryScoped();
  const tarball = path.join(directory, TARBALL);
  yield* runOrFail("vp", ["pm", "pack", "--out", tarball]);
  return tarball;
});

const check = Effect.fn("check")(function* check(hasSizeLimit: boolean) {
  yield* runOrFail("vp", ["run", "build"]);
  yield* runOrFail("vp", ["run", "test"]);
  if (hasSizeLimit) {
    yield* runOrFail("vp", ["run", "size"]);
  }
});

const publish = Effect.fn("publish")(function* publish() {
  const manifest = yield* manifestOf();
  const { name, version } = manifest;
  const published = yield* exitCodeOf("npm", ["view", `${name}@${version}`, "version"]);
  if (published === SUCCESS) {
    return yield* Console.log(`${name}@${version} is already published, skipping`);
  }
  yield* check(Predicate.isNotUndefined(manifest["size-limit"]));
  const tarball = yield* pack();
  const token = yield* npmToken();
  const env = Option.match(token, {
    onNone: () => ({}),
    onSome: (value) => ({ NODE_AUTH_TOKEN: value }),
  });
  return yield* runOrFail("npm", ["publish", tarball, "--provenance", "--access", "public"], env);
});

runMain("npm-publish")(Effect.scoped(publish()));
