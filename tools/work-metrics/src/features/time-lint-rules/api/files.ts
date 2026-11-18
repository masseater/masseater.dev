import { metricsInFile, spansInFile } from "@r_masseater/vitest-otlp/collector-files";
import { Array as Arr, Effect, Path } from "effect";

import { ruleCosts } from "#/features/time-lint-rules/model/rules.ts";
import { readTelemetry } from "#/shared/api/index.ts";

const readSpans = readTelemetry(spansInFile);
const readMetrics = readTelemetry(metricsInFile);

/** @internal */
export const lintRuleCosts = Effect.fn("lintRules.files")(function* lintRuleCosts(
  directories: readonly string[],
) {
  const path = yield* Path.Path;
  const spans = yield* Effect.forEach(
    directories,
    (directory) => readSpans(path.join(directory, "traces.jsonl")),
    { concurrency: 4 },
  );
  const metrics = yield* Effect.forEach(
    directories,
    (directory) => readMetrics(path.join(directory, "metrics.jsonl")),
    { concurrency: 4 },
  );
  return ruleCosts(Arr.flatten(metrics))(Arr.flatten(spans));
});
