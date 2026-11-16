import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { deepStrictEqual } from "@effect/vitest/utils";
import { Array as Arr, Effect, FileSystem, Path, String as Str, pipe } from "effect";

import { TIMEOUT } from "./fixtures.test.support.ts";
import { packageRoot } from "./oxlint.test.support.ts";

const CHAT_MARKERS = ["chat/completions", 'role: "user"', 'role: "system"'] as const;
const TEST_FILE = /\.test(?:\.support)?\.ts$/u;

const isSource = (file: string): boolean => Str.endsWith(".ts")(file) && !TEST_FILE.test(file);

const callsChat = (text: string): boolean =>
  pipe(
    CHAT_MARKERS,
    Arr.some((marker) => Str.includes(marker)(text)),
  );

const chatCallsInSource = Effect.gen(function* test() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* packageRoot;
  const src = path.join(root, "src");
  const entries = yield* fs.readDirectory(src, { recursive: true });
  const sources = pipe(entries, Arr.filter(isSource));
  const texts = yield* pipe(
    sources,
    Effect.forEach((file) =>
      Effect.map(fs.readFileString(path.join(src, file)), (text) => [file, text] as const),
    ),
  );
  deepStrictEqual(
    pipe(
      texts,
      Arr.filter(([, text]) => callsChat(text)),
      Arr.map(([file]) => file),
    ),
    [],
  );
});

layer(NodeServices.layer, { excludeTestServices: true })("decision models only", (it) => {
  it.effect("has no chat-completions call in the plugin source", () => chatCallsInSource, TIMEOUT);
});
