import { Schema } from "effect";

import { Outcomes } from "#outcome";

const Missing = Schema.Array(Schema.Literals(["token", "audio"]));

const LastRun = Schema.Union([
  Schema.Struct({ status: Schema.Literal("notReady"), at: Schema.Finite, missing: Missing }),
  Schema.Struct({ status: Schema.Literal("done"), at: Schema.Finite, outcomes: Outcomes }),
  Schema.Struct({ status: Schema.Literal("failed"), at: Schema.Finite, reason: Schema.String }),
]);

type LastRunValue = typeof LastRun.Type;

export type { LastRunValue };
