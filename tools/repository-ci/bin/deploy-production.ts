#!/usr/bin/env node
import { fail, mustSucceed } from "@r_masseater/github-workflow";
import { runMain } from "@r_masseater/node-main";
import { Array as Arr, Config, Duration, Effect, Result, Schema, pipe } from "effect";

import { workspace } from "./lib/changes.ts";
import { Stacks, deployed, record } from "./lib/deployment.ts";

type Stack = (typeof Stacks.Type)[number];

const STACK_TIMEOUT_MINUTES = 20;
const STACK_TIMEOUT = Duration.minutes(STACK_TIMEOUT_MINUTES);

const deploy = Effect.fn("deploy")(function* deploy(root: string, { name, filter }: Stack) {
  yield* Effect.annotateCurrentSpan({ stack: name });
  yield* mustSucceed({
    command: "vp",
    args: ["run", "--log", "labeled", "--filter", filter, "deploy:production"],
    cwd: root,
  });
  const deployment = deployed(name);
  yield* record(deployment);
});

runMain("deploy-production")(
  Effect.gen(function* deployProduction() {
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
  }),
);
