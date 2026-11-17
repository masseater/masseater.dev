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
  Record as Rec,
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
  napi: Schema.optional(Schema.Unknown),
});
const PackageJson = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));
const PlatformManifest = Schema.Struct({ name: Schema.String, version: Schema.String });

const NPM_DIR = "npm";
const NATIVE_DIR = "native";
const IdToken = Schema.Struct({ value: Schema.String });
const Grants = Schema.Struct({ npmToken: Schema.optional(Schema.String) });

const manifestOf = Effect.fn("manifest")(function* manifestOf() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString("package.json");
  return yield* Schema.decodeEffect(Schema.fromJsonString(Manifest))(text);
});

const platformManifestOf = Effect.fn("platformManifest")(function* platformManifestOf(
  directory: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(directory, "package.json"));
  return yield* Schema.decodeEffect(Schema.fromJsonString(PlatformManifest))(text);
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
  yield* Effect.forEach(Option.toArray(token), mask, { concurrency: 1 });
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

const authEnv = Effect.fn("authEnv")(function* authEnv() {
  const token = yield* npmToken();
  return Option.match(token, {
    onNone: (): Readonly<Record<string, string>> => ({}),
    onSome: (value) => ({ NODE_AUTH_TOKEN: value }),
  });
});

const isPublished = Effect.fn("isPublished")(function* isPublished(name: string, version: string) {
  const exitCode = yield* exitCodeOf("npm", ["view", `${name}@${version}`, "version"]);
  return exitCode === SUCCESS;
});

const publishPlatform = Effect.fn("publishPlatform")(function* publishPlatform(
  directory: string,
  env: Readonly<Record<string, string>>,
) {
  const { name, version } = yield* platformManifestOf(directory);
  if (yield* isPublished(name, version)) {
    yield* Console.log(`${name}@${version} is already published, skipping`);
    return name;
  }
  yield* runOrFail("npm", ["publish", directory, "--provenance", "--access", "public"], env);
  return name;
});

const addOptionalDependencies = Effect.fn("optionalDependencies")(function* addOptionalDependencies(
  names: readonly string[],
  version: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString("package.json");
  const manifest = yield* Schema.decodeEffect(PackageJson)(text);
  const optionalDependencies = pipe(
    names,
    Arr.map((name): readonly [string, string] => [name, version]),
    Rec.fromEntries,
  );
  const updated = yield* Schema.encodeEffect(PackageJson)({ ...manifest, optionalDependencies });
  yield* fileSystem.writeFileString("package.json", updated);
});

const publishPlatforms = Effect.fn("publishPlatforms")(function* publishPlatforms(
  manifest: typeof Manifest.Type,
  env: Readonly<Record<string, string>>,
) {
  if (Predicate.isUndefined(manifest.napi)) {
    return;
  }
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* runOrFail("vp", ["exec", "napi", "create-npm-dirs"]);
  yield* runOrFail("vp", ["exec", "napi", "artifacts", "--output-dir", NATIVE_DIR]);
  const entries = yield* fileSystem.readDirectory(NPM_DIR);
  const directories = pipe(
    entries,
    Arr.map((entry) => path.join(NPM_DIR, entry)),
  );
  const names = yield* Effect.forEach(directories, (directory) => publishPlatform(directory, env), {
    concurrency: 1,
  });
  yield* addOptionalDependencies(names, manifest.version);
});

const publishNew = Effect.fn("publishNew")(function* publishNew(
  manifest: typeof Manifest.Type,
  env: Readonly<Record<string, string>>,
) {
  const { name, version } = manifest;
  if (yield* isPublished(name, version)) {
    return yield* Console.log(`${name}@${version} is already published, skipping`);
  }
  yield* check(Predicate.isNotUndefined(manifest["size-limit"]));
  yield* publishPlatforms(manifest, env);
  const tarball = yield* pack();
  return yield* runOrFail("npm", ["publish", tarball, "--provenance", "--access", "public"], env);
});

const publish = Effect.fn("publish")(function* publish() {
  const manifest = yield* manifestOf();
  const env = yield* authEnv();
  return yield* publishNew(manifest, env);
});

runMain("npm-publish")(Effect.scoped(publish()));
