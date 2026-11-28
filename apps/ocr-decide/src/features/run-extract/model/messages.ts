import { UiSchema } from "@effect/ui";
import { Array as Arr, Option, Redacted, Schema, pipe } from "effect";

import { LineSchema, PictureSchema, WAYS } from "#/entities/extraction/index.ts";
import type { Source } from "#/entities/extraction/index.ts";

const NO_KEY = "";

/** @stability experimental */
export const RunPanelMessage = UiSchema.TaggedEnum({
  ChangedApiKey: { apiKey: Schema.Redacted(Schema.String) },
  ClickedRun: {},
  SucceededExtract: { lines: Schema.Array(LineSchema) },
  FailedExtract: { reason: Schema.String },
});

/** @stability experimental */
export const RunState = UiSchema.TaggedEnum({
  Idle: {},
  Running: {},
  Failed: { reason: Schema.String },
  Done: { lines: Schema.Array(LineSchema) },
});

/** @stability experimental */
export const RunPanelProps = Schema.Struct({
  picture: Schema.Option(PictureSchema),
  way: Schema.String,
});

/** @stability experimental */
export const RunPanelModel = Schema.Struct({
  apiKey: Schema.Redacted(Schema.String),
  run: RunState,
});

export const EMPTY_KEY = Redacted.make(NO_KEY);

export interface Request {
  readonly source: Source;
  readonly apiKey: Redacted.Redacted;
  readonly way: string;
}

/** @stability experimental */
export const requestOf = ({
  props: { picture, way },
  model: { apiKey, run },
}: Readonly<{
  props: typeof RunPanelProps.Type;
  model: typeof RunPanelModel.Type;
}>): Option.Option<Request> =>
  pipe(
    picture,
    Option.filter(
      () =>
        Redacted.value(apiKey) !== NO_KEY &&
        !RunState.guards.Running(run) &&
        pipe(
          WAYS,
          Arr.some(({ key }) => key === way),
        ),
    ),
    Option.map(({ source }) => ({ source, apiKey, way })),
  );
