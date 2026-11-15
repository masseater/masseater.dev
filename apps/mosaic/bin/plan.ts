#!/usr/bin/env node
import { writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array as Arr, Effect, Schema, pipe } from "effect";

import { rebuildPlan } from "./lib/rebuild.ts";
import { POOL } from "./lib/repository.ts";

const encodeSlugs = Schema.encodeEffect(Schema.fromJsonString(Schema.Array(Schema.String)));

const plan = Effect.gen(function* plan() {
  const { rebuild, web } = yield* rebuildPlan;
  const slugs = yield* encodeSlugs(
    pipe(
      CHARACTERS,
      Arr.map(({ slug }) => slug),
    ),
  );
  yield* writeOutputs({ rebuild: String(rebuild), web: String(web), slugs, pool: POOL });
});

runMain("mosaic-plan")(plan);
