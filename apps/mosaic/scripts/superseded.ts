#!/usr/bin/env node
import { writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Config, Effect, String as Str } from "effect";

import { supersededBy } from "./rebuild.ts";

const steps = Config.String("SUPERSEDING_STEPS").pipe(
  Config.withDefault("rebuild"),
  Config.map(Str.split(" ")),
);

const superseded = Effect.gen(function* superseded() {
  const names = yield* steps;
  const found = yield* supersededBy(names);
  yield* writeOutputs({ superseded: String(found) });
});

runMain("mosaic-superseded")(superseded);
