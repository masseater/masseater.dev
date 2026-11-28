import { fail, mustSucceed } from "@r_masseater/github-workflow";
import { Array as Arr, Config, Duration, Effect, Result, Schema, pipe } from "effect";

import { Stacks, deployed, record } from "#/entities/deployment/index.ts";
import { workspace } from "#/entities/workspace/index.ts";

import { snapshotAfter } from "./snapshot.ts";

type Stack = (typeof Stacks.Type)[number];

const STACK_TIMEOUT_MINUTES = 10;
const STACK_TIMEOUT = Duration.minutes(STACK_TIMEOUT_MINUTES);
const SNAPSHOT_AFTER_MINUTES = 7;
const SNAPSHOT_AFTER = Duration.minutes(SNAPSHOT_AFTER_MINUTES);

const deploy = Effect.fn("deploy")(function* deploy(root: string, { name, filter }: Stack) {
  yield* Effect.annotateCurrentSpan({ stack: name });
  yield* Effect.forkScoped(snapshotAfter(name, SNAPSHOT_AFTER));
  yield* mustSucceed({
    command: "vp",
    args: ["run", "--log", "labeled", "--filter", filter, "deploy:production"],
    cwd: root,
  });
  const deployment = deployed(name);
  yield* record(deployment);
}, Effect.scoped);

/** @internal */
export const deployProduction = Effect.gen(function* deployProduction() {
  const stacks = yield* Config.String("STACKS").pipe(Effect.flatMap(Schema.decodeEffect(Stacks)));
  const { workspaceRoot } = yield* workspace;
  const results = yield* Effect.forEach(
    stacks,
    (stack) => deploy(workspaceRoot, stack).pipe(Effect.timeout(STACK_TIMEOUT), Effect.result),
    { concurrency: "unbounded" },
  );
  return yield* pipe(
    Arr.zip(stacks, results),
    Arr.filter(([, result]) => Result.isFailure(result)),
    Arr.map(([{ name }]) => name),
    Arr.match({
      onEmpty: () => Effect.void,
      onNonEmpty: (failed) => fail(`deploy:production failed for ${Arr.join(failed, ", ")}`),
    }),
  );
});
