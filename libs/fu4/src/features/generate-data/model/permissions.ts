import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import type { HttpClient } from "effect/http";

import { failedWith } from "#/shared/lib/errors.ts";
import type { Fu4Error } from "#/shared/lib/errors.ts";

import { fetchText } from "./fetch.ts";
import { WORKFLOW_SCHEMA } from "./sources.ts";

const REFERENCE_PREFIX = "#/definitions/";
const SCOPES = "permissions-event";

const Levels = Schema.optionalKey(Schema.Array(Schema.String));

const Scope = Schema.Struct({ enum: Levels, $ref: Schema.optionalKey(Schema.String) });

const Definition = Schema.Struct({
  enum: Levels,
  properties: Schema.optionalKey(Schema.Record(Schema.String, Scope)),
});

const WorkflowSchema = Schema.Struct({ definitions: Schema.Record(Schema.String, Definition) });

type Definitions = (typeof WorkflowSchema.Type)["definitions"];

const decodeWorkflowSchema = Schema.decodeEffect(Schema.fromJsonString(WorkflowSchema));

const referenced = (
  definitions: Definitions,
  reference: string,
): Option.Option<readonly string[]> =>
  pipe(
    Rec.get(definitions, Str.replace(REFERENCE_PREFIX, "")(reference)),
    Option.flatMap((definition) => Option.fromNullishOr(definition.enum)),
  );

const levelsOf =
  (definitions: Definitions) =>
  (scope: typeof Scope.Type): readonly string[] =>
    pipe(
      Option.fromNullishOr(scope.enum),
      Option.orElse(() =>
        pipe(
          Option.fromNullishOr(scope.$ref),
          Option.flatMap((reference) => referenced(definitions, reference)),
        ),
      ),
      Option.getOrElse(Arr.empty<string>),
    );

/** @internal */
export const permissions: Effect.Effect<
  Record<string, readonly string[]>,
  Fu4Error,
  HttpClient.HttpClient
> = Effect.gen(function* permissions() {
  const source = yield* fetchText(WORKFLOW_SCHEMA);
  const schema = yield* decodeWorkflowSchema(source).pipe(
    Effect.mapError(failedWith("could not read the workflow schema")),
  );
  const scopes = pipe(
    Rec.get(schema.definitions, SCOPES),
    Option.flatMap((definition) => Option.fromNullishOr(definition.properties)),
    Option.getOrElse(Rec.empty<string, typeof Scope.Type>),
  );
  return pipe(
    Rec.toEntries(scopes),
    Arr.sortWith(([name]) => name, Str.Order),
    Arr.map(([name, scope]) => [name, levelsOf(schema.definitions)(scope)] as const),
    Rec.fromEntries,
  );
});
