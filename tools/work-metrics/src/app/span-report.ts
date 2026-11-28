import { Effect, Schema } from "effect";

import { spanCosts, spanSummary, spansInDirectories } from "#/features/time-spans/index.ts";
import { writeReport } from "#/shared/lib/output.ts";

const SpanRow = Schema.Struct({
  kind: Schema.String,
  name: Schema.String,
  runs: Schema.Finite,
  totalSeconds: Schema.Finite,
  p50Seconds: Schema.Finite,
  p90Seconds: Schema.Finite,
  maxSeconds: Schema.Finite,
});

const NOTE =
  "totalSeconds adds up every span of that name, and a span that holds other spans counts their time again, so compare rows of the same kind.";

/** @internal */
export const reportSpans = Effect.fn("command.reportSpans")(function* reportSpans(
  input: Readonly<{ dir: readonly string[]; out: string; top: number; title: string }>,
) {
  const spans = yield* spansInDirectories(input.dir);
  const costs = spanCosts(spans);
  yield* writeReport({
    out: input.out,
    name: "spans",
    codec: Schema.Array(SpanRow),
    value: costs,
    summary: `## ${input.title}\n\n${NOTE}\n\n${spanSummary(input.top)(costs)}\n`,
  });
});
