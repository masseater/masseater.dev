import { Array as Arr, Effect, Option, Schema, Stream, String as Str, pipe } from "effect";
import { ChildProcess } from "effect/process";
import { resolveConfigFromFile } from "vite-plus";

import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { WorkspaceSettingsInvalid } from "./workspace-config-source.ts";
import { workspaceDirectories } from "./workspace-directories.ts";

const RULE: RuleName = "unverified-crate";
const CARGO_FILE = "Cargo.toml";
const CONFIG_FILE = "vite.config.ts";
const SEPARATOR = "/";
const FIRST = 1;
const READ_CONCURRENCY = 8;

const CrateEntry = Schema.Struct({ name: Schema.String, manifest_path: Schema.String });
const CrateList = Schema.fromJsonString(Schema.Struct({ packages: Schema.Array(CrateEntry) }));
const decodeCrateList = Schema.decodeUnknownEffect(CrateList);
const Tasks = Schema.Struct({ verify: Schema.Unknown });
const isVerified = Schema.is(Schema.Struct({ run: Schema.Struct({ tasks: Tasks }) }));

interface Crate {
  readonly name: string;
  readonly manifest: string;
}

const cratesIn = Effect.fn("cratesIn")(function* cratesIn(root: string) {
  const handle = yield* ChildProcess.make(
    "cargo",
    ["metadata", "--no-deps", "--format-version", "1", "--offline"],
    { cwd: root, extendEnv: true, stdin: "ignore" },
  );
  const output = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
  const list = yield* decodeCrateList(output);
  return pipe(
    list.packages,
    Arr.map((crate): Crate => ({ name: crate.name, manifest: crate.manifest_path })),
  );
}, Effect.scoped);

const owningWorkspace =
  (directories: readonly string[]) =>
  (directory: string): Option.Option<string> => {
    const owners = pipe(
      directories,
      Arr.filter(
        (workspace) =>
          directory === workspace || Str.startsWith(`${workspace}${SEPARATOR}`)(directory),
      ),
    );
    return Arr.last(Arr.sort(owners, Str.Order));
  };

const hasVerifyTask = Effect.fn("hasVerifyTask")(function* hasVerifyTask(file: string) {
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => WorkspaceSettingsInvalid.make({ file, reason: "vite.config.ts does not load." }),
  }).pipe(Effect.option);
  return Option.exists(config, isVerified);
});

const problemFor = (crate: Crate, message: string): Problem => ({
  file: crate.manifest,
  line: FIRST,
  column: FIRST,
  rule: RULE,
  message: `crate ${crate.name} ${message}, so vp run verify never checks it.`,
});

const problemIn = Effect.fn("problemIn")(function* problemIn(
  root: string,
  directories: readonly string[],
  crate: Crate,
) {
  const files = yield* RepositoryFiles;
  const workspace = owningWorkspace(directories)(
    files.relative(root, files.dirname(crate.manifest)),
  );
  if (Option.isNone(workspace)) {
    return Option.some(problemFor(crate, "is outside every workspace package"));
  }
  const verified = yield* hasVerifyTask(files.join(root, workspace.value, CONFIG_FILE));
  if (verified) {
    return Option.none<Problem>();
  }
  return Option.some(
    problemFor(crate, `is in ${workspace.value}, whose ${CONFIG_FILE} has no verify task`),
  );
});

/** @internal */
const checkCrates = Effect.fn("checkCrates")(function* checkCrates(root: string) {
  const files = yield* RepositoryFiles;
  const cargo = yield* files.exists(files.join(root, CARGO_FILE));
  if (!cargo) {
    return [];
  }
  const directories = yield* workspaceDirectories(root);
  const crates = yield* cratesIn(root);
  const found = yield* Effect.forEach(crates, (crate) => problemIn(root, directories, crate), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(found);
});

export { checkCrates };
