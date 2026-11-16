import { NodeFileSystem } from "@effect/platform-node-shared";
import { describe, expect, layer } from "@effect/vitest";
import { Effect, FileSystem } from "effect";

import { songJsonSchema } from "./json-schema.ts";

layer(NodeFileSystem.layer)("song.schema.json", (it) => {
  describe("the committed file", () => {
    it.effect("matches the schema; run `vp run schema` after changing it", () =>
      Effect.gen(function* matches() {
        const fileSystem = yield* FileSystem.FileSystem;
        const committed = yield* fileSystem.readFileString(
          new URL("../generated/song.schema.json", import.meta.url).pathname,
        );
        const generated = yield* songJsonSchema;
        expect(committed).toBe(generated);
      }),
    );
  });
});
