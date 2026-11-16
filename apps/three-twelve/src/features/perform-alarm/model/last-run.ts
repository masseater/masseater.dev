import { Schema } from "effect";

import { Outcomes } from "#/entities/outcome/index.ts";

const Missing = Schema.Array(Schema.Literals(["token", "audio"]));

const LastRun = Schema.Union([
  Schema.Struct({ status: Schema.Literal("notReady"), at: Schema.Finite, missing: Missing }),
  Schema.Struct({ status: Schema.Literal("done"), at: Schema.Finite, outcomes: Outcomes }),
  Schema.Struct({
    status: Schema.Literal("late"),
    at: Schema.Finite,
    lateBy: Schema.Finite,
    outcomes: Outcomes,
  }),
  Schema.Struct({ status: Schema.Literal("failed"), at: Schema.Finite, reason: Schema.String }),
]);

export type LastRunValue = typeof LastRun.Type;
