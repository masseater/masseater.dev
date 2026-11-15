import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { CATALOG_FILE, NICO_FILE } from "#/entities/catalog/index.ts";

const RELEASE = "nimado-data";
const NOTES = "nimado の曲の対応表とニコニコの再生数。YouTube の値は置かない。";
const TITLE = "nimado data";
const GZIP = ".gz";
const NICO_DAYS = "data/days/nico";
const NICO_DAYS_ARCHIVE = "nico-days.tar.gz";
const SUCCESS = 0;
const NO_ASSETS = 0;
const COMPRESSED = [CATALOG_FILE, NICO_FILE];
const SPACE = " ";

const taggedError = Schema.TaggedError;

class CommandFailed extends taggedError<CommandFailed, { readonly brand: unique symbol }>()(
  "CommandFailed",
  { message: Schema.String },
) {}

const command = (name: string, args: readonly string[]): ChildProcess.Command =>
  ChildProcess.make(name, [...args]);

const exitCodeOf = Effect.fn("state.exitCode")(function* exitCodeOf(
  name: string,
  args: readonly string[],
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(command(name, args));
  return Number(exitCode);
});

const run = (
  name: string,
  args: readonly string[],
): Effect.Effect<
  number,
  CommandFailed | Effect.Error<ReturnType<typeof exitCodeOf>>,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  exitCodeOf(name, args).pipe(
    Effect.filterOrFail(
      (exitCode) => exitCode === SUCCESS,
      (exitCode) =>
        CommandFailed.make({
          message: `${name} ${pipe(args, Arr.join(SPACE))} exited with ${String(exitCode)}`,
        }),
    ),
  );

const output = Effect.fn("state.output")(function* outputOf(name: string, args: readonly string[]) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  return yield* spawner.string(command(name, args));
});

const repository = Config.String("GITHUB_REPOSITORY");

const assetCount = Effect.fn("state.assets")(function* assetCountOf(repo: string) {
  const count = yield* output("gh", [
    "release",
    "view",
    RELEASE,
    "--repo",
    repo,
    "--json",
    "assets",
    "--jq",
    ".assets | length",
  ]);
  return Number(Str.trim(count));
});

const createRelease = (repo: string): ReturnType<typeof run> =>
  run("gh", [
    "release",
    "create",
    RELEASE,
    "--repo",
    repo,
    "--prerelease",
    "--title",
    TITLE,
    "--notes",
    NOTES,
  ]);

const decompress = Effect.fn("state.decompress")(function* decompress(state: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const zipped = pipe(
    COMPRESSED,
    Arr.map((name) => path.join(state, `${name}${GZIP}`)),
  );
  const present = yield* pipe(
    zipped,
    Effect.filter((file) => fileSystem.exists(file)),
  );
  yield* Effect.forEach(present, (file) => run("gzip", ["-d", "-f", file]), { discard: true });
  const archive = path.join(state, NICO_DAYS_ARCHIVE);
  const archived = yield* fileSystem.exists(archive);
  if (archived) {
    yield* run("tar", ["-xzf", archive, "-C", state]);
    yield* fileSystem.remove(archive);
  }
});

const download = Effect.fn("state.download")(function* download(state: string, repo: string) {
  const assets = yield* assetCount(repo);
  if (assets === NO_ASSETS) {
    return;
  }
  yield* run("gh", ["release", "download", RELEASE, "--repo", repo, "--dir", state, "--clobber"]);
  yield* decompress(state);
});

/** @internal */
export const restoreState = Effect.fn("state.restore")(function* restoreStateInto(state: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const repo = yield* repository;
  yield* fileSystem.makeDirectory(state, { recursive: true });
  const viewed = yield* exitCodeOf("gh", ["release", "view", RELEASE, "--repo", repo]);
  if (viewed !== SUCCESS) {
    yield* createRelease(repo);
    return;
  }
  yield* download(state, repo);
});

const gzipped = Effect.fn("state.gzip")(function* gzipped(state: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const present = yield* pipe(
    COMPRESSED,
    Arr.map((name) => path.join(state, name)),
    Effect.filter((file) => fileSystem.exists(file)),
  );
  yield* Effect.forEach(present, (file) => run("gzip", ["-k", "-f", file]), { discard: true });
  return pipe(
    present,
    Arr.map((file) => `${file}${GZIP}`),
  );
});

const archiveNicoDays = Effect.fn("state.archive")(function* archiveNicoDays(
  state: string,
  upload: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const days = yield* fileSystem.exists(path.join(state, NICO_DAYS));
  if (!days) {
    return [];
  }
  const archive = path.join(upload, NICO_DAYS_ARCHIVE);
  yield* run("tar", ["-czf", archive, "-C", state, NICO_DAYS]);
  return [archive];
});

const uploadState = Effect.fn("state.upload")(function* uploadStateFrom(state: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const repo = yield* repository;
  const upload = yield* fileSystem.makeTempDirectoryScoped();
  const zipped = yield* gzipped(state);
  const archived = yield* archiveNicoDays(state, upload);
  const files = [...zipped, ...archived];
  if (!Arr.isReadonlyArrayNonEmpty(files)) {
    return;
  }
  yield* run("gh", ["release", "upload", RELEASE, "--repo", repo, "--clobber", ...files]);
});

/** @internal */
export const saveState = Effect.fn("state.save")(function* saveStateOf(state: string) {
  yield* Effect.scoped(uploadState(state));
});
