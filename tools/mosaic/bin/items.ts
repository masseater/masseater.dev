#!/usr/bin/env node
import { writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array as Arr, Effect, Schema, pipe } from "effect";

const encodeSlugs = Schema.encodeEffect(Schema.fromJsonString(Schema.Array(Schema.String)));

const items = Effect.gen(function* items() {
  const slugs = yield* encodeSlugs(
    pipe(
      CHARACTERS,
      Arr.map(({ slug }) => slug),
    ),
  );
  yield* writeOutputs({ items: slugs });
});

runMain("mosaic-items")(items);
