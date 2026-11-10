import { Effect, FileSystem, Function as Fn, String as Str } from "effect";
import type { PlatformError, Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { toBetterleaksToml, toIgnoreFile } from "./betterleaks.ts";
import { BETTERLEAKS } from "./binaries.ts";
import type { CheckError, CheckServices } from "./check.ts";
import { toolFailed } from "./errors.ts";
import type { VpToolsError } from "./errors.ts";
import type { Report } from "./report.ts";
import { withSection } from "./section-check.ts";
import type { BetterleaksConfig } from "./types.ts";
import { runVendored } from "./vendored.ts";

const DATA_FIRST_ARITY = 2;

const ignoreFileArgs = (
  config: BetterleaksConfig,
): Effect.Effect<
  readonly string[],
  PlatformError.PlatformError,
  FileSystem.FileSystem | Scope.Scope
> =>
  Effect.gen(function* ignoreFile() {
    const digests = toIgnoreFile(config);
    if (digests === "") {
      return [];
    }
    const fs = yield* FileSystem.FileSystem;
    const file = yield* fs.makeTempFileScoped({ prefix: "betterleaksignore-" });
    yield* fs.writeFileString(file, digests);
    return ["--ignore-file", file];
  });

const scanSecrets = ({
  config,
  root,
  args,
  input,
}: {
  readonly config: BetterleaksConfig;
  readonly root: string;
  readonly args: readonly string[];
  readonly input?: string;
}): Effect.Effect<Report, CheckError, CheckServices> =>
  Effect.gen(function* scan() {
    const ignore = yield* ignoreFileArgs(config);
    return yield* runVendored(BETTERLEAKS, {
      root,
      args: [...args, "--redact", "--no-banner", ...ignore],
      env: { BETTERLEAKS_CONFIG_TOML: toBetterleaksToml(config) },
      input,
    });
  }).pipe(Effect.scoped);

const SUCCESS = 0;

const lacksHistory = (
  root: string,
): Effect.Effect<boolean, PlatformError.PlatformError, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* history() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const shallow = yield* spawner.string(
      ChildProcess.make("git", ["rev-parse", "--is-shallow-repository"], { cwd: root }),
    );
    const promisor = yield* spawner.exitCode(
      ChildProcess.make("git", ["config", "--get", "remote.origin.promisor"], { cwd: root }),
    );
    return Str.trim(shallow) === "true" || promisor === SUCCESS;
  });

const succeeded = <Failure, Services>(
  tool: string,
  run: Effect.Effect<number, Failure, Services>,
): Effect.Effect<void, Failure | VpToolsError, Services> =>
  run.pipe(
    Effect.flatMap((code) => {
      if (code === SUCCESS) {
        return Effect.void;
      }
      return Effect.fail(toolFailed(tool)(`exit code ${code}`));
    }),
  );

const scanCommittedTree = (
  config: BetterleaksConfig,
  root: string,
): Effect.Effect<Report, CheckError, CheckServices> =>
  Effect.gen(function* tree() {
    const fs = yield* FileSystem.FileSystem;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "vpa-betterleaks-" });
    const archive = `${directory}.tar`;
    yield* succeeded(
      "git archive",
      spawner.exitCode(
        ChildProcess.make("git", ["archive", "--format=tar", "-o", archive, "HEAD"], { cwd: root }),
      ),
    );
    yield* succeeded(
      "tar",
      spawner.exitCode(ChildProcess.make("tar", ["-xf", archive, "-C", directory])),
    );
    yield* fs.remove(archive);
    return yield* scanSecrets({ config, root, args: [directory] });
  }).pipe(Effect.scoped);

const betterleaksCheck = withSection("betterleaks", (config, { root, base }) =>
  lacksHistory(root).pipe(
    Effect.flatMap((partial) => {
      if (partial) {
        return scanCommittedTree(config, root);
      }
      return scanSecrets({ config, root, args: ["git", ".", `--revision=${base}..HEAD`] });
    }),
  ),
);

const STAGED_DIFF = [
  "diff",
  "--cached",
  "--no-ext-diff",
  "--no-textconv",
  "--no-color",
  "--src-prefix=a/",
  "--dst-prefix=b/",
];

const scanStagedSecrets: {
  (root: string): (config: BetterleaksConfig) => Effect.Effect<Report, CheckError, CheckServices>;
  (config: BetterleaksConfig, root: string): Effect.Effect<Report, CheckError, CheckServices>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (config: BetterleaksConfig, root: string): Effect.Effect<Report, CheckError, CheckServices> =>
    Effect.gen(function* staged() {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const diff = yield* spawner.string(ChildProcess.make("git", STAGED_DIFF, { cwd: root }));
      return yield* scanSecrets({ config, root, args: ["stdin", "--git-diff"], input: diff });
    }),
);

/** @internal */
export { betterleaksCheck, scanStagedSecrets };
