#!/usr/bin/env node
import { post, postJson } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Config, Effect, Schema } from "effect";

import { ENVIRONMENT, deployTask } from "./deployment.ts";

const Created = Schema.Struct({ id: Schema.Int });

runMain("record-deploy")(
  Effect.gen(function* recordDeploy() {
    const stack = yield* Config.String("STACK");
    const sha = yield* Config.String("GITHUB_SHA");
    const url = yield* Config.String("RUN_URL");
    const { id } = yield* postJson(Created)({
      path: "deployments",
      body: {
        ref: sha,
        task: deployTask(stack),
        environment: ENVIRONMENT,
        auto_merge: false,
        required_contexts: [],
        production_environment: true,
        description: stack,
      },
    });
    yield* post({
      path: `deployments/${String(id)}/statuses`,
      body: { state: "success", log_url: url, auto_inactive: false },
    });
  }),
);
