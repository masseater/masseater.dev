import { getJson, post, postJson, warn } from "@r_masseater/github-workflow";
import { Array as Arr, Config, Effect, Option, Schema, pipe } from "effect";

import { isProduction } from "#/entities/deployment/model/deployment.ts";
import type { DeploymentRecord } from "#/entities/deployment/model/deployment.ts";

const Deployments = Schema.Array(Schema.Struct({ sha: Schema.String }));

const Created = Schema.Struct({ id: Schema.Int });

/** @internal */
export const lastRecorded = Effect.fn("lastRecorded")(
  function* lastRecorded({ environment, task }: DeploymentRecord) {
    const deployments = yield* getJson(Deployments)(
      `deployments?environment=${encodeURIComponent(environment)}&task=${encodeURIComponent(task)}&per_page=1`,
    );
    return pipe(
      Arr.head(deployments),
      Option.map(({ sha }) => sha),
    );
  },
  Effect.tapError(() => warn("The deployments could not be read, so it counts as changed")),
  Effect.orElseSucceed(Option.none),
);

/** @internal */
export const record = Effect.fn("record")(function* record({
  environment,
  task,
}: DeploymentRecord) {
  const sha = yield* Config.String("GITHUB_SHA");
  const url = yield* Config.String("RUN_URL");
  const { id } = yield* postJson(Created)({
    path: "deployments",
    body: {
      ref: sha,
      task,
      environment,
      auto_merge: false,
      required_contexts: [],
      production_environment: isProduction(environment),
      description: task,
    },
  });
  yield* post({
    path: `deployments/${String(id)}/statuses`,
    body: { state: "success", log_url: url, auto_inactive: false },
  });
});
