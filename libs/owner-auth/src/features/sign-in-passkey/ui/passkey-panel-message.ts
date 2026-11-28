import { UiSchema } from "@effect/ui";
import { Schema } from "effect";

export const PasskeyKind = Schema.Literals(["register", "sign-in"]);

/** @stability experimental */
export const PasskeyPanelMessage = UiSchema.TaggedEnum({
  ClickedStart: {},
  SucceededStartPasskey: {},
  FailedStartPasskey: {},
});
