#!/usr/bin/env node
import { post, postJson } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Config, Effect, Schema } from "effect";

const Created = Schema.Struct({ id: Schema.Int });

runMain("record-deployment")(
  Effect.gen(function* recordDeployment() {
    const environment = yield* Config.String("DEPLOYMENT_ENVIRONMENT");
    const task = yield* Config.String("DEPLOYMENT_TASK");
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
        production_environment: environment === "production",
        description: task,
      },
    });
    yield* post({
      path: `deployments/${String(id)}/statuses`,
      body: { state: "success", log_url: url, auto_inactive: false },
    });
  }),
);
