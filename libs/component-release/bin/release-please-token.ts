#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Effect, Layer, Option } from "effect";
import { Argument, Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";

import { setOutput } from "#/actions.ts";
import { githubToken } from "#/broker.ts";
import { component } from "#/manifest.ts";
import { releasedOnMain } from "#/release.ts";

const command = Command.make(
  "release-please-token",
  { name: Argument.String("component") },
  ({ name }) =>
    Effect.gen(function* token() {
      const target = yield* component(name);
      const released = yield* releasedOnMain(target);
      if (!released) {
        return;
      }
      const http = yield* Layer.build(FetchHttpClient.layer);
      const issued = yield* githubToken().pipe(Effect.provideContext(http));
      if (Option.isSome(issued)) {
        yield* setOutput("token", issued.value);
      }
    }).pipe(Effect.scoped),
);

runMain("release-please-token")(Command.run(command, { version: "0.0.0" }));
