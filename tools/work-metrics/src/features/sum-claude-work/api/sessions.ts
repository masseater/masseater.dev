import { logsInFile } from "@r_masseater/vitest-otlp/collector-files";
import { Effect, Path } from "effect";

import { workOf } from "#/features/sum-claude-work/model/work.ts";
import { directoriesIn, readTelemetry } from "#/shared/api/index.ts";

const readLogs = readTelemetry(logsInFile);

/** @internal */
export const sessionWork = Effect.fn("claudeWork.sessions")(function* sessionWork(root: string) {
  const path = yield* Path.Path;
  const sessions = yield* directoriesIn(root);
  return yield* Effect.forEach(
    sessions,
    ({ name, directory }) =>
      readLogs(path.join(directory, "logs.jsonl")).pipe(Effect.map(workOf(name))),
    { concurrency: 4 },
  );
});
