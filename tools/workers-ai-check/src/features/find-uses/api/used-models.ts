import { Effect } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { modelsIn } from "#/entities/model-use/index.ts";

const GREP = [
  "grep",
  "-I",
  "-h",
  "-o",
  "-E",
  String.raw`@cf/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+`,
  "--",
  ":(top)",
  ":(top,exclude)*.test.ts",
  ":(top,exclude)*.md",
];

const modelsInRepository = Effect.fn("workersAi.usedModels")(function* modelsInRepository() {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const output = yield* spawner.string(ChildProcess.make("git", GREP));
  return modelsIn(output);
});

/** @internal */
export const usedModels = modelsInRepository;
