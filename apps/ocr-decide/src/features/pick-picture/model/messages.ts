import { UiSchema } from "@effect/ui";
import { Schema } from "effect";

import { PictureSchema } from "#/entities/extraction/index.ts";

/** @stability experimental */
export const PicturePickerMessage = UiSchema.TaggedEnum({
  ChoseFiles: { files: Schema.Array(Schema.instanceOf(File)) },
  ClickedSample: { name: Schema.String },
  LoadedPicture: { picture: PictureSchema },
  FailedLoadPicture: { name: Schema.String },
});

/** @stability experimental */
export const PicturePickerEvents = UiSchema.TaggedEnum({
  ChangedPicture: { picture: Schema.Option(PictureSchema) },
});

/** @stability experimental */
export const PicturePickerStatus = UiSchema.TaggedEnum({
  None: {},
  Loading: { name: Schema.String },
  Failed: { name: Schema.String },
  Ready: { name: Schema.String },
});
