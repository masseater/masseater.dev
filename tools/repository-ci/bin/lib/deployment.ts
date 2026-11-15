import { getJson, warn } from "@masseater.dev/github-workflow";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

const Deployments = Schema.Array(Schema.Struct({ sha: Schema.String }));

/** @internal */
export type DeploymentRecord = Readonly<{ environment: string; task: string }>;

/** @internal */
export const deployed = (stack: string): DeploymentRecord => ({
  environment: "production",
  task: `deploy:${stack}`,
});

/** @internal */
export const released = (component: string): DeploymentRecord => ({
  environment: "release",
  task: `release:${component}`,
});

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
