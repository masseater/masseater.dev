#!/usr/bin/env node
import { Effect, FileSystem } from "effect";

import { songJsonSchema } from "#/features/generate-schema/index.ts";
import { runWithNode } from "#/shared/lib/node-services.ts";

const target = new URL("../generated/song.schema.json", import.meta.url);

runWithNode(
  Effect.gen(function* writeSchema() {
    const fileSystem = yield* FileSystem.FileSystem;
    const schema = yield* songJsonSchema;
    yield* fileSystem.writeFileString(target.pathname, schema);
  }),
);
