#!/usr/bin/env node
import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect, FileSystem, Layer, Path } from "effect";

import { pageHeaders } from "#/features/write-site/index.ts";
import { ASSETS_DIR, OUTDIR } from "#/shared/config/index.ts";

const PAGE = "index.html";
const HEADERS_FILE = "_headers";

const program = Effect.gen(function* writeSite() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const html = yield* fileSystem.readFileString(path.join(ASSETS_DIR, PAGE));
  yield* fileSystem.remove(OUTDIR, { recursive: true, force: true });
  yield* fileSystem.makeDirectory(OUTDIR, { recursive: true });
  yield* fileSystem.copyFile(path.join(ASSETS_DIR, PAGE), path.join(OUTDIR, PAGE));
  const headers = yield* pageHeaders(html);
  yield* fileSystem.writeFileString(path.join(OUTDIR, HEADERS_FILE), headers);
});

runMain(
  nodeServices.pipe(
    Layer.build,
    Effect.flatMap((context) => Effect.provideContext(program, context)),
    Effect.scoped,
  ),
);
