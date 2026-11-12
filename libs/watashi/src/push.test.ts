import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, FileSystem, Path, Redacted, String as Str, pipe } from "effect";
import { HttpClient } from "effect/http";
import { expect } from "vite-plus/test";

import { asWatashi } from "./api.ts";
import { endsWithNewline, fakeWatashi } from "./fake-watashi.test.support.ts";
import { pushFile } from "./push.ts";
import type { PushTarget } from "./push.ts";

const SESSION = "d2ecb348-3cde-4a66-93b9-6229842073a9";
const KEY = `claude-code/${SESSION}/${SESSION}`;
const LONG_LINES = 50;
const SMALL_CHUNK = 8192;
const MIN_CHUNKS = 5;
const PADDING_LENGTH = 1000;
const FIRST_LINE = 1;
const PADDING = Str.repeat(PADDING_LENGTH)("x");

const longHistory = pipe(
  Arr.range(FIRST_LINE, LONG_LINES),
  Arr.map((index) => `{"type":"user","uuid":"u${String(index)}","message":"${PADDING}"}\n`),
  Arr.join(""),
);

const targetOf = (path: string): PushTarget => ({
  kind: "claude-code",
  session: SESSION,
  file: SESSION,
  path,
  cwd: "",
  source: "claude-code-local",
  remoteSession: "",
});

const splitsAtLines = Effect.gen(function* splits() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "watashi-push-" });
  const transcript = path.join(root, `${SESSION}.jsonl`);
  yield* fs.writeFileString(transcript, longHistory);
  const server = fakeWatashi();
  const result = yield* pushFile({
    target: targetOf(transcript),
    detect: () => Effect.succeed([]),
    home: root,
    maxChunkBytes: SMALL_CHUNK,
  }).pipe(
    asWatashi({ url: "https://watashi.test", authorization: Redacted.make("wat_test") }),
    Effect.provideService(HttpClient.HttpClient, server.client),
  );
  expect(result.chunks).toBeGreaterThan(MIN_CHUNKS);
  expect(pipe(server.chunksOf(KEY), Arr.every(endsWithNewline))).toBe(true);
  expect(server.text(KEY)).toBe(longHistory);
}).pipe(Effect.scoped);

layer(nodeServices)("pushFile", (it) => {
  it.effect("splits a long history at line boundaries", () => splitsAtLines);
});
