import type { Stdio } from "effect";
import { Config, Effect, Option, Array as Arr, pipe } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type {
  CheckContext,
  CheckError,
  CheckServices,
  NamedCheck,
} from "#/entities/check/index.ts";
import { loadViteConfig } from "#/entities/vite-config/index.ts";
import { checksFailed } from "#/shared/lib/errors.ts";
import { writeTo } from "#/shared/lib/output.ts";
import type { Report } from "#/shared/lib/report.ts";

import { CHECKS } from "./checks.ts";

const DEFAULT_BRANCHES = ["origin/HEAD", "origin/main", "origin/master"];
const RESOLVED = 0;
const WHOLE_HISTORY = "HEAD";

const isCommit = (
  root: string,
  revision: string,
): Effect.Effect<boolean, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* verify() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const exitCode = yield* spawner.exitCode(
      ChildProcess.make("git", ["rev-parse", "-q", "--verify", `${revision}^{commit}`], {
        cwd: root,
      }),
    );
    return exitCode === RESOLVED;
  }).pipe(Effect.orElseSucceed(() => false));

const resolveRange = (
  root: string,
): Effect.Effect<string, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* range() {
    const configured = yield* Config.option(Config.String("VPA_BASE")).pipe(Effect.orDie);
    const candidates = [...Option.toArray(configured), ...DEFAULT_BRANCHES];
    const base = yield* Effect.findFirst(candidates, (revision) => isCommit(root, revision));
    return Option.match(base, {
      onNone: () => WHOLE_HISTORY,
      onSome: (revision) => `${revision}..HEAD`,
    });
  });

interface Outcome {
  readonly name: string;
  readonly report: Report;
}

const describe = ({ name, report }: Outcome): string => {
  if (report.valid) {
    return `✓ ${name}`;
  }
  return `✗ ${name}\n${report.output}`;
};

const runCheck =
  (context: CheckContext) =>
  ({ name, run }: NamedCheck): Effect.Effect<Option.Option<Outcome>, CheckError, CheckServices> =>
    run(context).pipe(Effect.map(Option.map((report) => ({ name, report }))));

/** @internal */
export const runAllChecks = (
  root: string,
): Effect.Effect<void, CheckError, CheckServices | Stdio.Stdio> =>
  Effect.gen(function* all() {
    const config = yield* loadViteConfig(root);
    const range = yield* resolveRange(root);
    const outcomes = yield* pipe(
      CHECKS,
      Effect.forEach(runCheck({ root, config, range }), { concurrency: "unbounded" }),
      Effect.map(Arr.getSomes),
    );
    yield* writeTo("stdout", `${pipe(outcomes, Arr.map(describe), Arr.join("\n"))}\n`);
    return yield* pipe(
      outcomes,
      Arr.filter(({ report }) => !report.valid),
      Arr.map(({ name }) => name),
      Arr.match({
        onEmpty: () => Effect.void,
        onNonEmpty: (failed) => Effect.fail(checksFailed(`Failed: ${Arr.join(failed, ", ")}`)),
      }),
    );
  });
