import { Array as Arr, DateTime, Effect, Schema, pipe } from "effect";
import { Command } from "effect/cli";

import { meterGroups, usageOf, usageSummary } from "#/features/cloudflare-usage/index.ts";
import { writeReport } from "#/shared/lib/output.ts";

import { daysFlag, outFlag } from "./flags.ts";

const Share = Schema.Struct({
  resource: Schema.String,
  amount: Schema.Finite,
  percent: Schema.Finite,
});

const Usage = Schema.Struct({
  meter: Schema.String,
  total: Schema.Finite,
  resources: Schema.Array(Share),
});

const runCloudflare = Effect.fn("command.cloudflare")(function* runCloudflare({
  days,
  out,
}: Readonly<{ days: number; out: string }>) {
  const now = yield* DateTime.now;
  const window = {
    since: DateTime.formatIsoDateUtc(DateTime.subtract(now, { days })),
    until: DateTime.formatIsoDateUtc(now),
  };
  const meters = yield* meterGroups(window);
  const usages = pipe(
    meters,
    Arr.map(({ meter, groups }) => usageOf(meter)(groups)),
  );
  yield* writeReport({
    out,
    name: "cloudflare",
    codec: Schema.Array(Usage),
    value: usages,
    summary: `## Cloudflare usage per resource, ${window.since} to ${window.until}\n\n${usageSummary(usages)}\n`,
  });
});

/** @internal */
export const cloudflareCommand = Command.make(
  "cloudflare",
  { days: daysFlag, out: outFlag },
  runCloudflare,
);
