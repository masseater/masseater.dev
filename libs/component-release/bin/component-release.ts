#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Effect, Option } from "effect";
import { Argument, Command } from "effect/cli";

import { component } from "#/entities/component/index.ts";
import { filesIn, publishRelease, uploadAssets } from "#/features/publish-release/index.ts";

const command = Command.make(
  "component-release",
  {
    name: Argument.String("component"),
    title: Argument.String("title"),
    directory: Argument.Directory("assets"),
  },
  ({ name, title, directory }) =>
    Effect.gen(function* release() {
      const target = yield* component(name);
      const tag = yield* publishRelease({ component: target, title });
      if (Option.isNone(tag)) {
        return;
      }
      const files = yield* filesIn(directory);
      yield* uploadAssets({ tag: tag.value, files });
    }),
);

runMain("component-release")(Command.run(command, { version: "0.0.0" }));
