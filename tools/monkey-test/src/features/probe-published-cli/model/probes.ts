import { Array as Arr, Boolean as Bool, Option, pipe } from "effect";

import { findingOf } from "#/entities/finding/index.ts";
import type { Finding } from "#/entities/finding/index.ts";
import type { ProcessResult } from "#/shared/lib/run-process.ts";

export type ProbeName = "help" | "version" | "unknown-flag" | "garbage" | "bad-bytes";

export type Probe = Readonly<{ name: ProbeName; args: readonly string[] }>;

export type BinRun = Readonly<{ target: string; probe: Probe; result: ProcessResult }>;

type Kind = Finding["kind"];

const NOT_EXITED = -1;

const CRASH_SIGNS: readonly RegExp[] = [
  /\n\s+at\s.+:\d+:\d+/u,
  /ERR_MODULE_NOT_FOUND/u,
  /ERR_UNSUPPORTED_DIR_IMPORT/u,
  /Cannot find (?:module|package) /u,
  /node:internal\//u,
  /\b(?:TypeError|ReferenceError|RangeError|SyntaxError): /u,
  /panicked at /u,
  /Segmentation fault/u,
];

const STARTUP_SIGNS: readonly RegExp[] = [
  /ERR_MODULE_NOT_FOUND/u,
  /ERR_PACKAGE_PATH_NOT_EXPORTED/u,
  /ERR_UNSUPPORTED_DIR_IMPORT/u,
  /ERR_REQUIRE_ESM/u,
  /Cannot find (?:module|package) /u,
  /^SyntaxError: /mu,
];

export const hasStartupSign = (output: string): boolean =>
  pipe(
    STARTUP_SIGNS,
    Arr.some((sign) => sign.test(output)),
  );

export const hasCrashSign = (output: string): boolean =>
  pipe(
    CRASH_SIGNS,
    Arr.some((sign) => sign.test(output)),
  );

export const probesOf = (workdir: string): readonly Probe[] => [
  { name: "help", args: ["--help"] },
  { name: "version", args: ["--version"] },
  { name: "unknown-flag", args: ["--monkey-unknown-flag"] },
  { name: "garbage", args: ["%", "_", "\u{1F600}", "-", "--", "../../../nowhere"] },
  { name: "bad-bytes", args: [workdir] },
];

const judged = (result: ProcessResult): Option.Option<Kind> =>
  pipe(
    Option.liftPredicate("cli-startup" as const, () => hasStartupSign(result.output)),
    Option.orElse(() =>
      Option.liftPredicate("cli-crash" as const, () => hasCrashSign(result.output)),
    ),
  );

const detailOf = (run: BinRun): string =>
  Bool.match(Option.isNone(run.result.exit), {
    onTrue: () => `${run.probe.name} did not exit in time`,
    onFalse: () =>
      `${run.probe.name} exit=${Option.getOrElse(run.result.exit, () => NOT_EXITED)} ${run.result.output}`,
  });

export const findingOfRun = (run: BinRun): Option.Option<Finding> =>
  pipe(
    Option.liftPredicate("cli-hang" as const, () => Option.isNone(run.result.exit)),
    Option.orElse(() => judged(run.result)),
    Option.map((kind) => findingOf({ kind, target: run.target, detail: detailOf(run) })),
  );
