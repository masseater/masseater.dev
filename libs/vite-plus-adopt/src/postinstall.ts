import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { ACTIONLINT, BETTERLEAKS, ZIZMOR } from "./binaries.ts";
import { installBinary } from "./install.ts";
import { runCli } from "./run-cli.ts";

const BINARIES = [BETTERLEAKS, ACTIONLINT, ZIZMOR];

const installAll = Effect.forEach(BINARIES, installBinary, {
  concurrency: "unbounded",
  discard: true,
});

const program = Layer.build(FetchHttpClient.layer).pipe(
  Effect.flatMap((context) => Effect.provideContext(installAll, context)),
  Effect.scoped,
);

runCli(program);
