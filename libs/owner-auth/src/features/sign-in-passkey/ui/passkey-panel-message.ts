import { UiSchema } from "@effect/ui";
import { Schema } from "effect";

export const PasskeyKind = Schema.Literals(["register", "sign-in"]);

export const PasskeyPanelMessage = UiSchema.TaggedEnum({
  ClickedStart: {},
  SucceededStartPasskey: {},
  FailedStartPasskey: {},
});
