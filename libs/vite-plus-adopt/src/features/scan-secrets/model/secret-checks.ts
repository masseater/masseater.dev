import { format, makeDetector } from "@r_masseater/h56m";
import type { GitSource, H56mConfig } from "@r_masseater/h56m";
import { Array as Arr, Boolean as Bool, Effect, Function as Fn, String as Str, pipe } from "effect";
import type { PlatformError } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { CheckError, CheckServices } from "#/entities/check/index.ts";
import { withSection } from "#/entities/check/index.ts";
import { toolFailed } from "#/shared/lib/errors.ts";
import type { Report } from "#/shared/lib/report.ts";

const DATA_FIRST_ARITY = 2;
const SUCCESS = 0;
const RANGE = "..";
const HEAD = "HEAD";

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

const historyOf = (range: string): GitSource =>
  pipe(
    Str.split(range, RANGE),
    Arr.match({
      onEmpty: (): GitSource => ({ type: "history", head: HEAD }),
      onNonEmpty: ([base, ...rest]): GitSource =>
        Arr.match(rest, {
          onEmpty: (): GitSource => ({ type: "history", head: range }),
          onNonEmpty: ([head]): GitSource => ({ type: "history", bases: [base], head }),
        }),
    }),
  );

const sourceOf = (partial: boolean, range: string): GitSource =>
  Bool.match(partial, {
    onTrue: (): GitSource => ({ type: "snapshot", revision: HEAD }),
    onFalse: () => historyOf(range),
  });

const scan = (
  config: H56mConfig,
  root: string,
  source: GitSource,
): Effect.Effect<Report, CheckError> =>
  Effect.gen(function* scanSource() {
    const detector = yield* makeDetector(config);
    const found = yield* detector.scanGit({ root, source });
    return {
      valid: Arr.isReadonlyArrayEmpty(found),
      output: pipe(found, Arr.map(format), Arr.join("\n")),
    };
  }).pipe(Effect.mapError(toolFailed("h56m")));

/** @internal */
export const h56mCheck = withSection("h56m", (config, { root, range }) =>
  lacksHistory(root).pipe(
    Effect.flatMap((partial) => scan(config, root, sourceOf(partial, range))),
  ),
);

/** @internal */
export const scanStagedSecrets: {
  (root: string): (config: H56mConfig) => Effect.Effect<Report, CheckError, CheckServices>;
  (config: H56mConfig, root: string): Effect.Effect<Report, CheckError, CheckServices>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (config: H56mConfig, root: string): Effect.Effect<Report, CheckError, CheckServices> =>
    scan(config, root, { type: "staged" }),
);
