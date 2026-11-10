import { Config, Effect, FileSystem, Option, Path, pipe } from "effect";

import { ACTIONLINT, ZIZMOR } from "./binaries.ts";
import type { Binary } from "./binaries.ts";
import type { Check } from "./check.ts";
import { runVendored } from "./vendored.ts";

const WORKFLOWS = ".github/workflows";

const onWorkflows =
  (binary: Binary, args: Effect.Effect<readonly string[]>): Check =>
  ({ root }) =>
    Effect.gen(function* workflows() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      if (!(yield* fs.exists(path.join(root, WORKFLOWS)))) {
        return Option.none();
      }
      const resolvedArgs = yield* args;
      const ran = yield* runVendored(binary, { root, args: resolvedArgs });
      return Option.some(ran);
    });

const actionlintCheck = onWorkflows(ACTIONLINT, Effect.succeed([]));

const zizmorArgs = Effect.gen(function* zizmorArgs() {
  const remote = yield* Config.option(Config.String("CLAUDE_CODE_REMOTE")).pipe(Effect.orDie);
  return pipe(
    remote,
    Option.match({
      onNone: () => [".github"],
      onSome: () => ["--no-online-audits", ".github"],
    }),
  );
});

const zizmorCheck = onWorkflows(ZIZMOR, zizmorArgs);

/** @internal */
export { actionlintCheck, zizmorCheck };
