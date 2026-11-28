import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import { compactInput } from "./compact-schema.ts";

type InputSchema = Schema.ConstraintDecoder<unknown> & Schema.Constraint;

export const toolInputOf = <Target extends InputSchema>(
  schema: Target,
): StandardSchemaWithJSON<Target["Encoded"], Target["Type"]> =>
  pipe(schema, Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1, compactInput);
