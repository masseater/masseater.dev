import { UiSchema } from "@effect/ui";

export const ConsentPromptMessage = UiSchema.TaggedEnum({
  ClickedAllow: {},
  ClickedDeny: {},
  SucceededAnswerConsent: {},
  FailedAnswerConsent: {},
});
