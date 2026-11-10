import type { Stdio } from "effect";
import { Config, Effect, Option, Array as Arr, pipe } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { CheckContext, CheckError, CheckServices, NamedCheck } from "./check.ts";
import { CHECKS } from "./checks.ts";
import { loadViteConfig } from "./config.ts";
import { checksFailed } from "./errors.ts";
import { writeTo } from "./output.ts";
import type { Report } from "./report.ts";

const DEFAULT_BASE = "origin/main";
const RESOLVED = 0;

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

const resolveBase = (
  root: string,
): Effect.Effect<string, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* base() {
    const configured = yield* Config.option(Config.String("VPA_BASE")).pipe(Effect.orDie);
    if (Option.isSome(configured) && (yield* isCommit(root, configured.value))) {
      return configured.value;
    }
    return DEFAULT_BASE;
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

const runAllChecks = (root: string): Effect.Effect<void, CheckError, CheckServices | Stdio.Stdio> =>
  Effect.gen(function* all() {
    const config = yield* loadViteConfig(root);
    const base = yield* resolveBase(root);
    const outcomes = yield* pipe(
      CHECKS,
      Effect.forEach(runCheck({ root, config, base }), { concurrency: "unbounded" }),
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

export { runAllChecks };
