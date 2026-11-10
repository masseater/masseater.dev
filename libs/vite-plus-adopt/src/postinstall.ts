import { Effect } from "effect";
import { FetchHttpClient } from "effect/http";

import { ACTIONLINT, BETTERLEAKS, ZIZMOR } from "./binaries.ts";
import { installBinary } from "./install.ts";
import { runCli } from "./run-cli.ts";

const BINARIES = [BETTERLEAKS, ACTIONLINT, ZIZMOR];

runCli(
  Effect.forEach(BINARIES, installBinary, { concurrency: "unbounded", discard: true }).pipe(
    Effect.provide(FetchHttpClient.layer),
  ),
);
