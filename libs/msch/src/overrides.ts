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
import type { OverrideKey } from "./override-resolution.ts";
import type { Problem } from "./problem.ts";

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
  readonly manifest: string;
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
    const target = path.join(directory, file);
    const copy = fs.copyFile(path.join(workspace.root, file), target);
    return fs.makeDirectory(path.dirname(target), { recursive: true }).pipe(Effect.andThen(copy));
  };
  yield* Effect.forEach(workspace.files, copyOne, { discard: true });
});

const resolutionWith = Effect.fn("resolutionWith")(function* resolutionWith(
  workspace: Workspace,
  override: string,
  manifest: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fs.makeTempDirectoryScoped({ prefix: "msch-overrides-" });
  yield* copyFiles(workspace, directory);
  yield* fs.writeFileString(path.join(directory, WORKSPACE_FILE), manifest);
  const output = yield* resolveIn(directory, override);
  const lockfile = yield* fs.readFileString(path.join(directory, LOCKFILE));
  yield* Effect.annotateCurrentSpan({ "msch.override": override });
  const advisories = yield* auditIn(directory);
  return resolutionOf({ peerIssues: peerIssuesIn(output), advisories })(lockfile);
}, Effect.scoped);

const problemsFor = Effect.fn("problemsFor")(function* problemsFor(
  root: string,
  manifest: string,
  keys: readonly OverrideKey[],
) {
  const path = yield* Path.Path;
  const files = yield* trackedResolutionFiles(root);
  const workspace: Workspace = { root, files, manifest };
  const baseline = yield* resolutionWith(workspace, BASELINE_PROBE, withBaselineProbe(manifest));
  const judgeAgainstBaseline = judge(baseline);
  const file = path.join(root, WORKSPACE_FILE);
  const problemOf = (
    located: OverrideKey,
  ): Effect.Effect<Option.Option<Problem>, CandidateFailure, CandidateServices> =>
    resolutionWith(workspace, located.key, withoutOverride(located.key)(manifest)).pipe(
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
const checkOverrides = Effect.fn("checkOverrides")(function* checkOverrides(root: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const manifest = yield* fs.readFileString(path.join(root, WORKSPACE_FILE)).pipe(Effect.option);
  const keys = Option.match(manifest, { onNone: () => [], onSome: overrideKeysOf });
  if (Option.isNone(manifest) || !Arr.isReadonlyArrayNonEmpty(keys)) {
    return [];
  }
  return yield* problemsFor(root, manifest.value, keys);
});

export { checkOverrides };
