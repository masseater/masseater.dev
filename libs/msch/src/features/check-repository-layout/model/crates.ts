import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import {
  cratesIn,
  hasVerifyTask,
  owningWorkspace,
  workspaceDirectories,
} from "#/entities/workspace/index.ts";
import type { Crate } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "unverified-crate";
const VERSION_RULE: RuleName = "release-version";
const MANIFEST_FILE = "package.json";
const APP_DIRECTORIES: readonly string[] = ["", "src-tauri"];
const CARGO_FILE = "Cargo.toml";
const CONFIG_FILE = "vite.config.ts";
const SEPARATOR = "/";
const FIRST = 1;
const READ_CONCURRENCY = 8;

const PackageVersion = Schema.fromJsonString(Schema.Struct({ version: Schema.String }));

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

const versionProblemIn = Effect.fn("versionProblemIn")(function* versionProblemIn(
  root: string,
  directories: readonly string[],
  crate: Crate,
) {
  const files = yield* RepositoryFiles;
  const directory = files.relative(root, files.dirname(crate.manifest));
  const workspace = pipe(
    directories,
    Arr.findFirst((candidate) =>
      pipe(
        APP_DIRECTORIES,
        Arr.map((inner) =>
          pipe([candidate, inner], Arr.filter(Str.isNonEmpty), Arr.join(SEPARATOR)),
        ),
        Arr.contains(directory),
      ),
    ),
  );
  if (Option.isNone(workspace)) {
    return Option.none<Problem>();
  }
  const text = yield* files.readFile(files.join(root, workspace.value, MANIFEST_FILE));
  const version = pipe(
    text,
    Option.flatMap(Schema.decodeOption(PackageVersion)),
    Option.map((manifest) => manifest.version),
  );
  if (Option.isNone(version) || version.value === crate.version) {
    return Option.none<Problem>();
  }
  return Option.some<Problem>({
    file: crate.manifest,
    line: FIRST,
    column: FIRST,
    rule: VERSION_RULE,
    message: `crate ${crate.name} is version ${crate.version} but ${workspace.value}/${MANIFEST_FILE} is ${version.value}. msch-publish releases the version in package.json, so bump both in the same PR.`,
  });
});

/** @internal */
export const checkCrates = Effect.fn("checkCrates")(function* checkCrates(root: string) {
  const files = yield* RepositoryFiles;
  const cargo = yield* files.exists(files.join(root, CARGO_FILE));
  if (!cargo) {
    return [];
  }
  const directories = yield* workspaceDirectories(root);
  const crates = yield* cratesIn(root);
  const found = yield* Effect.forEach(
    crates,
    (crate) =>
      Effect.all(
        [problemIn(root, directories, crate), versionProblemIn(root, directories, crate)],
        {
          concurrency: "unbounded",
        },
      ),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.getSomes(Arr.flatten(found));
});
