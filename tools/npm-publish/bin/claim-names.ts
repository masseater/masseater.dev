import { post, postJson } from "@r_masseater/github-workflow";
import { runMain } from "@r_masseater/node-main";
import {
  Array as Arr,
  Console,
  Duration,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  Schedule,
  Schema,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const LIBS = "../../libs";
const REGISTRY = "https://registry.npmjs.org/";
const WORKFLOW = "publish.yml";
const ENVIRONMENT = "npm";
const REPOSITORY = "masseater/masseater.dev";
const PLACEHOLDER_VERSION = "0.0.0";
const SUCCESS = 0;
const TTY_SECONDS = 3600;
const APPROVAL_MINUTES = 5;
const APPROVAL_WINDOW = Duration.minutes(APPROVAL_MINUTES);
const ATTEMPTS = 6;
const VISIBLE_ATTEMPTS = 20;
const VISIBLE_SECONDS = 15;
const VISIBLE_INTERVAL = Duration.seconds(VISIBLE_SECONDS);
const AUTH_URL = /https:\/\/www\.npmjs\.com\/\S+/u;
const KEPT_FIELDS: readonly string[] = ["license", "repository", "homepage", "bugs"];

const taggedError = Schema.TaggedError;

class ClaimFailed extends taggedError<ClaimFailed, { readonly brand: unique symbol }>()(
  "ClaimFailed",
  { message: Schema.String },
) {}

const Native = Schema.Struct({ targets: Schema.Array(Schema.String) });

const Manifest = Schema.Struct({
  name: Schema.String,
  private: Schema.optional(Schema.Boolean),
  native: Schema.optional(Native),
});
const RawManifest = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));
const Issue = Schema.Struct({ number: Schema.Int });

interface Candidate {
  readonly name: string;
  readonly fields: Readonly<Record<string, unknown>>;
}

interface Session {
  readonly directory: string;
  readonly issue: number;
}

const candidatesOf = Effect.fn("candidatesOf")(function* candidatesOf(text: string) {
  const manifest = yield* Schema.decodeEffect(Schema.fromJsonString(Manifest))(text);
  const raw = yield* Schema.decodeEffect(RawManifest)(text);
  if (manifest.private === true) {
    return [];
  }
  const fields = pipe(
    raw,
    Rec.filter((_value, key) => pipe(KEPT_FIELDS, Arr.contains(key))),
  );
  const targets = pipe(
    Option.fromUndefinedOr(manifest.native),
    Option.map(({ targets: declared }) => declared),
    Option.getOrElse((): readonly string[] => []),
  );
  return [
    { name: manifest.name, fields },
    ...pipe(
      targets,
      Arr.map((target): Candidate => ({ name: `${manifest.name}-${target}`, fields })),
    ),
  ];
});

const candidatesIn = Effect.fn("candidatesIn")(function* candidatesIn(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const file = path.join(LIBS, directory, "package.json");
  if (!(yield* fileSystem.exists(file))) {
    return [];
  }
  const text = yield* fileSystem.readFileString(file);
  return yield* candidatesOf(text);
});

const isOnRegistry = Effect.fn("isOnRegistry")(function* isOnRegistry(spec: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(
    ChildProcess.make("npm", ["view", spec, "version", "--registry", REGISTRY], {
      stdout: "ignore",
      stderr: "ignore",
    }),
  );
  return Number(exitCode) === SUCCESS;
});

const missingNames = Effect.fn("missingNames")(function* missingNames() {
  const fileSystem = yield* FileSystem.FileSystem;
  const directories = yield* fileSystem.readDirectory(LIBS);
  const candidates = yield* Effect.forEach(directories, candidatesIn, { concurrency: 1 });
  return yield* Effect.filter(Arr.flatten(candidates), ({ name }) =>
    Effect.map(isOnRegistry(name), (found) => !found),
  );
});

const openIssue = Effect.fn("openIssue")(function* openIssue(names: readonly string[]) {
  const issue = yield* postJson(Issue)({
    path: "issues",
    body: {
      title: "npm: approve the first publish of new package names",
      body: pipe(
        names,
        Arr.map((name) => `- ${name}`),
        Arr.join("\n"),
      ),
    },
  });
  return issue.number;
});

const note = Effect.fn("note")(function* note(session: Session, text: string) {
  yield* Console.log(text);
  yield* post({
    path: `issues/${String(session.issue)}/comments`,
    body: { body: text },
  }).pipe(
    Effect.catch((error) => Console.error(`could not comment on the issue: ${String(error)}`)),
  );
});

const announce = Effect.fn("announce")(function* announce(
  session: Session,
  label: string,
  line: string,
) {
  yield* Console.log(line);
  const url = pipe(Option.fromNullishOr(AUTH_URL.exec(line)), Option.flatMap(Arr.head));
  if (Option.isSome(url)) {
    yield* note(session, `${label}: ${url.value}`);
  }
});

const quoted = (args: readonly string[]): string =>
  pipe(
    args,
    Arr.map((arg) => `'${arg}'`),
    Arr.join(" "),
  );

const runApproved = Effect.fn("runApproved")(function* runApproved(
  session: Session,
  label: string,
  args: readonly string[],
) {
  const command = `script -qfec "npm ${quoted(args)}" /dev/null < <(sleep ${String(TTY_SECONDS)})`;
  const handle = yield* ChildProcess.make("bash", ["-c", command], {
    cwd: session.directory,
    env: { NPM_CONFIG_USERCONFIG: `${session.directory}/.npmrc` },
    extendEnv: true,
    stderr: "inherit",
  });
  const [, exitCode] = yield* Effect.all(
    [
      handle.stdout.pipe(
        Stream.decodeText(),
        Stream.splitLines,
        Stream.runForEach((line) => announce(session, label, line)),
      ),
      handle.exitCode,
    ],
    { concurrency: "unbounded" },
  );
  if (Number(exitCode) !== SUCCESS) {
    return yield* ClaimFailed.make({ message: `${label} exited with ${String(exitCode)}` });
  }
  return exitCode;
}, Effect.scoped);

const approved = Effect.fn("approved")(function* approved(
  session: Session,
  label: string,
  args: readonly string[],
) {
  yield* runApproved(session, label, args).pipe(
    Effect.timeoutOrElse({
      duration: APPROVAL_WINDOW,
      orElse: () => ClaimFailed.make({ message: `${label} was not approved in time` }),
    }),
    Effect.retry({ times: ATTEMPTS }),
  );
});

const writePlaceholder = Effect.fn("writePlaceholder")(function* writePlaceholder(
  session: Session,
  candidate: Candidate,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = path.join(session.directory, Str.replaceAll("/", "__")(candidate.name));
  yield* fileSystem.makeDirectory(directory, { recursive: true });
  const text = yield* Schema.encodeEffect(RawManifest)({
    ...candidate.fields,
    name: candidate.name,
    version: PLACEHOLDER_VERSION,
    description: "Reserves the name until the first release from CI.",
  });
  yield* fileSystem.writeFileString(path.join(directory, "package.json"), text);
  return directory;
});

const visible = Effect.fn("visible")(function* visible(name: string) {
  if (!(yield* isOnRegistry(`${name}@${PLACEHOLDER_VERSION}`))) {
    return yield* ClaimFailed.make({ message: `${name} is not visible on the registry yet` });
  }
  return name;
});

const waitUntilVisible = Effect.fn("waitUntilVisible")(function* waitUntilVisible(name: string) {
  const schedule = Schedule.spaced(VISIBLE_INTERVAL);
  return yield* visible(name).pipe(Effect.retry({ schedule, times: VISIBLE_ATTEMPTS }));
});

const claim = Effect.fn("claim")(function* claim(session: Session, candidate: Candidate) {
  const directory = yield* writePlaceholder(session, candidate);
  yield* approved(session, `publish ${candidate.name}`, [
    "publish",
    directory,
    "--access",
    "public",
    "--provenance=false",
    "--auth-type=web",
    "--registry",
    REGISTRY,
  ]);
  yield* waitUntilVisible(candidate.name);
  yield* approved(session, `trust ${candidate.name}`, [
    "trust",
    "github",
    candidate.name,
    "--file",
    WORKFLOW,
    "--repository",
    REPOSITORY,
    "--environment",
    ENVIRONMENT,
    "--yes",
    "--registry",
    REGISTRY,
  ]);
  yield* note(session, `claimed ${candidate.name}`);
});

const claimMissing = Effect.fn("claimMissing")(function* claimMissing(
  missing: readonly Candidate[],
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const names = pipe(
    missing,
    Arr.map(({ name }) => name),
  );
  yield* Console.log(`claiming ${Arr.join(names, ", ")}`);
  const directory = yield* fileSystem.makeTempDirectoryScoped();
  const issue = yield* openIssue(names);
  const session: Session = { directory, issue };
  yield* approved(session, "login", ["login", "--auth-type=web", "--registry", REGISTRY]);
  yield* Effect.forEach(missing, (candidate) => claim(session, candidate), {
    concurrency: 1,
    discard: true,
  });
  yield* note(session, "every name is claimed");
});

const claimAll = Effect.fn("claimAll")(function* claimAll() {
  const missing = yield* missingNames();
  if (Arr.isReadonlyArrayEmpty(missing)) {
    return yield* Console.log("every public package name already exists on npm");
  }
  return yield* claimMissing(missing);
});

claimAll().pipe(Effect.scoped, runMain("claim-names"));
