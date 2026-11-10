import { Effect, Path, Stdio } from "effect";

import { runCli } from "./run-cli.ts";
import { runVpa } from "./vpa.ts";

runCli(
  Effect.gen(function* main() {
    const stdio = yield* Stdio.Stdio;
    const path = yield* Path.Path;
    const args = yield* stdio.args;
    return yield* runVpa(path.resolve("."), args);
  }),
);
