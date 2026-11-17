import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { ACTIONLINT, ZIZMOR, installBinary } from "#/entities/binary/index.ts";

import { runCli } from "./run-cli.ts";

const BINARIES = [ACTIONLINT, ZIZMOR];

const installAll = Effect.forEach(BINARIES, installBinary, {
  concurrency: "unbounded",
  discard: true,
});

const program = Layer.build(FetchHttpClient.layer).pipe(
  Effect.flatMap((context) => Effect.provideContext(installAll, context)),
  Effect.scoped,
);

runCli(program);
