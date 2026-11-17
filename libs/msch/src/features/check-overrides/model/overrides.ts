import { updateWorkspaceManifest } from "@pnpm/workspace.workspace-manifest-writer";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Schema,
  Stream,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect";
import { ChildProcess } from "effect/process";
import type { ChildProcessSpawner } from "effect/process";

import { lockedPackages, workspaceManifest } from "#/entities/workspace/index.ts";
import type { Problem } from "#/shared/lib/problem.ts";

import { overrideProblem } from "./override-findings.ts";
import {
  BASELINE_PROBE,
  advisoriesIn,
  judge,
  overrideKeysOf,
  peerIssuesIn,
  resolutionOf,
  withBaselineProbe,
  withoutOverride,
} from "./override-resolution.ts";
import type { OverrideKey, Overrides } from "./override-resolution.ts";

const WORKSPACE_FILE = "pnpm-workspace.yaml";
const LOCKFILE = "pnpm-lock.yaml";
const RESOLUTION_FILES = ["*package.json", WORKSPACE_FILE, LOCKFILE, ".npmrc", "patches/*"];
const RESOLUTION_CONCURRENCY = 4;
const SUCCEEDED = 0;

const taggedError = Schema.TaggedError;

class OverrideResolutionFailed extends taggedError<
  OverrideResolutionFailed,
  { readonly brand: unique symbol }
>()("OverrideResolutionFailed", { override: Schema.String, output: Schema.String }) {}

type CandidateFailure = OverrideResolutionFailed | PlatformError.PlatformError;
type CandidateServices =
  | FileSystem.FileSystem
  | Path.Path
  | ChildProcessSpawner.ChildProcessSpawner;

interface Workspace {
  readonly root: string;
  readonly files: readonly string[];
  readonly overrides: Overrides;
}

const textOf = <Failure>(
  stream: Stream.Stream<Uint8Array, Failure>,
): Effect.Effect<string, Failure> => stream.pipe(Stream.decodeText(), Stream.mkString);

const resolveIn = Effect.fn("resolveIn")(function* resolveIn(directory: string, override: string) {
  const handle = yield* ChildProcess.make(
    "vp",
    ["install", "--lockfile-only", "--ignore-scripts", "--", "--reporter=ndjson"],
    { cwd: directory, env: { CI: "true" }, extendEnv: true, stdin: "ignore" },
  );
  const [output, status] = yield* Effect.all([textOf(handle.all), handle.exitCode], {
    concurrency: "unbounded",
  });
  if (Number(status) !== SUCCEEDED) {
    return yield* OverrideResolutionFailed.make({ override, output });
  }
  return output;
});

const auditIn = Effect.fn("auditIn")(function* auditIn(directory: string) {
  const handle = yield* ChildProcess.make("vp", ["pm", "audit", "--json"], {
    cwd: directory,
    extendEnv: true,
    stdin: "ignore",
  });
  const [report] = yield* Effect.all([textOf(handle.stdout), handle.exitCode], {
    concurrency: "unbounded",
  });
  return advisoriesIn(report);
}, Effect.scoped);

const trackedResolutionFiles = Effect.fn("trackedResolutionFiles")(function* trackedFiles(
  root: string,
) {
  const handle = yield* ChildProcess.make("git", ["ls-files", "-z", "--", ...RESOLUTION_FILES], {
    cwd: root,
  });
  const listed = yield* textOf(handle.stdout);
  return pipe(Str.split(listed, "\0"), Arr.filter(Str.isNonEmpty));
}, Effect.scoped);

const copyFiles = Effect.fn("copyFiles")(function* copyFiles(
  workspace: Workspace,
  directory: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const copyOne = (file: string): Effect.Effect<void, PlatformError.PlatformError> => {
    const source = path.join(workspace.root, file);
    const target = path.join(directory, file);
    const copy = fs.copyFile(source, target);
    const write = fs
      .makeDirectory(path.dirname(target), { recursive: true })
      .pipe(Effect.andThen(copy));
    return Effect.when(write, fs.exists(source));
  };
  yield* Effect.forEach(workspace.files, copyOne, { concurrency: 1, discard: true });
});

const depPathsIn = (
  directory: string,
  override: string,
): Effect.Effect<readonly string[], OverrideResolutionFailed> =>
  lockedPackages(directory).pipe(
    Effect.mapBoth({
      onSuccess: Option.getOrElse((): readonly string[] => []),
      onFailure: ({ reason }) => OverrideResolutionFailed.make({ override, output: reason }),
    }),
  );

const resolutionWith = Effect.fn("resolutionWith")(function* resolutionWith(
  workspace: Workspace,
  override: string,
  overrides: Overrides,
) {
  const fs = yield* FileSystem.FileSystem;
  const directory = yield* fs.makeTempDirectoryScoped({ prefix: "msch-overrides-" });
  yield* copyFiles(workspace, directory);
  yield* Effect.tryPromise({
    try: () =>
      updateWorkspaceManifest(directory, { updatedFields: { overrides: { ...overrides } } }),
    catch: (cause) => OverrideResolutionFailed.make({ override, output: String(cause) }),
  });
  const output = yield* resolveIn(directory, override);
  const depPaths = yield* depPathsIn(directory, override);
  yield* Effect.annotateCurrentSpan({ "msch.override": override });
  const advisories = yield* auditIn(directory);
  return resolutionOf({ peerIssues: peerIssuesIn(output), advisories })(depPaths);
}, Effect.scoped);

const problemsFor = Effect.fn("problemsFor")(function* problemsFor(
  root: string,
  overrides: Overrides,
  keys: readonly OverrideKey[],
) {
  const path = yield* Path.Path;
  const files = yield* trackedResolutionFiles(root);
  const workspace: Workspace = { root, files, overrides };
  const baseline = yield* resolutionWith(workspace, BASELINE_PROBE, withBaselineProbe(overrides));
  const judgeAgainstBaseline = judge(baseline);
  const file = path.join(root, WORKSPACE_FILE);
  const problemOf = (
    located: OverrideKey,
  ): Effect.Effect<Option.Option<Problem>, CandidateFailure, CandidateServices> =>
    resolutionWith(workspace, located.key, withoutOverride(located.key)(overrides)).pipe(
      Effect.map((candidate) =>
        overrideProblem({ ...located, file })(judgeAgainstBaseline(located.key, candidate)),
      ),
    );
  const problems = yield* Effect.forEach(keys, problemOf, {
    concurrency: RESOLUTION_CONCURRENCY,
  });
  return Arr.getSomes(problems);
});

/** @internal */
export const checkOverrides = Effect.fn("checkOverrides")(function* checkOverrides(root: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const source = yield* fs.readFileString(path.join(root, WORKSPACE_FILE)).pipe(Effect.option);
  const manifest = yield* workspaceManifest(root);
  const overrides: Overrides = pipe(
    manifest,
    Option.flatMap((found) => Option.fromUndefinedOr(found.overrides)),
    Option.getOrElse((): Overrides => ({})),
  );
  const keys = pipe(
    source,
    Option.map((text) => overrideKeysOf(text)(overrides)),
    Option.getOrElse((): readonly OverrideKey[] => []),
  );
  if (!Arr.isReadonlyArrayNonEmpty(keys)) {
    return [];
  }
  return yield* problemsFor(root, overrides, keys);
});
