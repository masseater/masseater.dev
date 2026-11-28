import {
  Array as Arr,
  Boolean as Bool,
  Duration,
  Effect,
  FileSystem,
  Option,
  Path,
  pipe,
} from "effect";

import { findingOf } from "#/entities/finding/index.ts";
import type { Finding } from "#/entities/finding/index.ts";
import { writeInvalidUtf8Inputs } from "#/features/probe-published-cli/api/write-bad-inputs.ts";
import type { PublishedBin } from "#/features/probe-published-cli/model/bins.ts";
import { findingOfRun, probesOf } from "#/features/probe-published-cli/model/probes.ts";
import { passedEnv } from "#/shared/lib/process-env.ts";
import { runProcess } from "#/shared/lib/run-process.ts";

const INSTALL_MINUTES = 10;
const PROBE_MINUTES = 2;
const SUCCESS = 0;

type Workplace = Readonly<{
  published: PublishedBin;
  directory: string;
  inputs: string;
  env: Readonly<Record<string, string>>;
}>;

const targetOf = (published: PublishedBin, bin: string): string =>
  `${published.name}@${published.version} ${bin}`;

const installFailure = (published: PublishedBin, output: string): Finding =>
  findingOf({
    kind: "cli-startup",
    target: `${published.name}@${published.version}`,
    detail: `npm install failed ${output}`,
  });

const probeBins = Effect.fn("monkey.cli.bins")(function* probeBins(work: Workplace) {
  const path = yield* Path.Path;
  const plan = pipe(
    work.published.bins,
    Arr.flatMap((bin) =>
      pipe(
        probesOf(work.inputs),
        Arr.map((probe) => ({ bin, probe })),
      ),
    ),
  );
  const runs = yield* Effect.forEach(
    plan,
    ({ bin, probe }) =>
      runProcess({
        command: path.join(work.directory, "node_modules", ".bin", bin),
        args: probe.args,
        cwd: work.directory,
        env: work.env,
        timeout: Duration.minutes(PROBE_MINUTES),
      }).pipe(Effect.map((result) => ({ target: targetOf(work.published, bin), probe, result }))),
    { concurrency: 1 },
  );
  return pipe(
    runs,
    Arr.flatMap((run) => Option.toArray(findingOfRun(run))),
  );
});

const probePackage = Effect.fn("monkey.cli.package")(function* probePackage(
  published: PublishedBin,
) {
  const fs = yield* FileSystem.FileSystem;
  const environment = yield* passedEnv;
  const directory = yield* fs.makeTempDirectoryScoped({ prefix: "monkey-cli-" });
  const inputs = yield* writeInvalidUtf8Inputs(directory);
  const env = { ...environment, HOME: directory, NO_COLOR: "1", CI: "1" };
  const installed = yield* runProcess({
    command: "npm",
    args: ["install", "--no-audit", "--no-fund", `${published.name}@${published.version}`],
    cwd: directory,
    env,
    timeout: Duration.minutes(INSTALL_MINUTES),
  });
  return yield* Bool.match(Option.contains(installed.exit, SUCCESS), {
    onTrue: () => probeBins({ published, directory, inputs, env }),
    onFalse: () => Effect.succeed([installFailure(published, installed.output)]),
  });
});

/** @internal */
export const probeInstalledPackage = probePackage;
