#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Effect } from "effect";
import { Argument, Command } from "effect/cli";

import { component } from "#/entities/component/index.ts";
import { tagComponent } from "#/features/publish-release/index.ts";

const command = Command.make("component-tag", { name: Argument.String("component") }, ({ name }) =>
  Effect.gen(function* tag() {
    const target = yield* component(name);
    const created = yield* tagComponent(target);
    yield* Effect.logInfo(created);
  }),
);

runMain("component-tag")(Command.run(command, { version: "0.0.0" }));
