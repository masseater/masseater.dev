import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import { compactInput } from "./compact-schema.ts";

export const toolInputOf = <Target extends Schema.ConstraintDecoder<unknown> & Schema.Constraint>(
  schema: Target,
): StandardSchemaWithJSON<Target["Encoded"], Target["Type"]> =>
  pipe(schema, Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1, compactInput);
