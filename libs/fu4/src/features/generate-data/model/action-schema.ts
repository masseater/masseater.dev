import { Array as Arr, Effect, Schema, pipe } from "effect";
import type { HttpClient } from "effect/http";

import { failedWith } from "#/shared/lib/errors.ts";
import type { Fu4Error } from "#/shared/lib/errors.ts";

import { fetchText } from "./fetch.ts";
import { isRetiredRuntime } from "./runtime.ts";
import { ACTION_SCHEMA } from "./sources.ts";

const Enumerated = Schema.Struct({ enum: Schema.Array(Schema.String) });

const Branding = Schema.Struct({
  properties: Schema.Struct({ color: Enumerated, icon: Enumerated }),
});

const JavaScriptRuns = Schema.Struct({ properties: Schema.Struct({ using: Enumerated }) });

const ActionSchema = Schema.Struct({
  properties: Schema.Struct({ branding: Branding }),
  definitions: Schema.Struct({ "runs-javascript": JavaScriptRuns }),
});

const decodeActionSchema = Schema.decodeEffect(Schema.fromJsonString(ActionSchema));

export interface ActionVocabulary {
  readonly colors: readonly string[];
  readonly icons: readonly string[];
  readonly runtimes: readonly string[];
}

/** @internal */
export const actionVocabulary: Effect.Effect<ActionVocabulary, Fu4Error, HttpClient.HttpClient> =
  Effect.gen(function* actionVocabulary() {
    const source = yield* fetchText(ACTION_SCHEMA);
    const schema = yield* decodeActionSchema(source).pipe(
      Effect.mapError(failedWith("could not read the action schema")),
    );
    const { color, icon } = schema.properties.branding.properties;
    const { using } = schema.definitions["runs-javascript"].properties;
    return {
      colors: color.enum,
      icons: icon.enum,
      runtimes: pipe(
        using.enum,
        Arr.filter((runtime) => !isRetiredRuntime(runtime)),
      ),
    };
  });
