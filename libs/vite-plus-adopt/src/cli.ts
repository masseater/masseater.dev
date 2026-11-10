import { Effect, Path, Stdio } from "effect";

import { runCli } from "./run-cli.ts";
import { runVpa } from "./vpa.ts";

runCli(
  Effect.gen(function* main() {
    const stdio = yield* Stdio.Stdio;
    const path = yield* Path.Path;
    return yield* runVpa(path.resolve("."), yield* stdio.args);
  }),
);
