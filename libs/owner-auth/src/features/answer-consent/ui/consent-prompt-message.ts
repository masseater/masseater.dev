import { UiSchema } from "@effect/ui";

/** @stability experimental */
export const ConsentPromptMessage = UiSchema.TaggedEnum({
  ClickedAllow: {},
  ClickedDeny: {},
  SucceededAnswerConsent: {},
  FailedAnswerConsent: {},
});
