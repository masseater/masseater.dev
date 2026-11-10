import { Effect, FileSystem } from "effect";
import type { PlatformError, Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { toBetterleaksToml, toIgnoreFile } from "./betterleaks.ts";
import { BETTERLEAKS } from "./binaries.ts";
import type { CheckError, CheckServices } from "./check.ts";
import type { Report } from "./report.ts";
import { withSection } from "./section-check.ts";
import type { BetterleaksConfig } from "./types.ts";
import { runVendored } from "./vendored.ts";

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

const betterleaksCheck = withSection("betterleaks", (config, { root, base }) =>
  scanSecrets({ config, root, args: ["git", ".", `--revision=${base}..HEAD`] }),
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

const scanStagedSecrets = (
  config: BetterleaksConfig,
  root: string,
): Effect.Effect<Report, CheckError, CheckServices> =>
  Effect.gen(function* staged() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const diff = yield* spawner.string(ChildProcess.make("git", STAGED_DIFF, { cwd: root }));
    return yield* scanSecrets({ config, root, args: ["stdin", "--git-diff"], input: diff });
  });

export { betterleaksCheck, scanStagedSecrets };
