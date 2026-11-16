import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class InterviewerDown extends taggedError<
  InterviewerDown,
  { readonly brand: unique symbol }
>()("InterviewerDown", { message: Schema.String }) {}

export const down = (cause: unknown): InterviewerDown =>
  InterviewerDown.make({ message: String(cause) });
