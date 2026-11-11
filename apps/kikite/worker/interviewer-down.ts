import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class InterviewerDown extends taggedError<InterviewerDown, { readonly brand: unique symbol }>()(
  "InterviewerDown",
  { message: Schema.String },
) {}

const down = (cause: unknown): InterviewerDown => InterviewerDown.make({ message: String(cause) });

export { InterviewerDown, down };
