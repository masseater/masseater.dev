import { Option, Result, Schema } from "effect";

import type { Capability } from "#/features/zizmor/model/step.ts";
import rows from "#/shared/data/zizmor/context-capabilities.json" with { type: "json" };

const Rows = Schema.Array(
  Schema.Tuple([Schema.String, Schema.Literals(["arbitrary", "structured", "fixed"])]),
);

const CAPABILITIES: ReadonlyMap<string, Capability> = new Map(
  Result.getOrThrow(Schema.decodeUnknownResult(Rows)(rows)),
);

export const capabilityOf = (pattern: string): Option.Option<Capability> =>
  Option.fromNullishOr(CAPABILITIES.get(pattern));
