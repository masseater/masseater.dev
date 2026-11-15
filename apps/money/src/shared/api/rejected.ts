import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class Rejected extends taggedError<Rejected, { readonly brand: unique symbol }>()(
  "Rejected",
  {
    message: Schema.String,
  },
) {}

export const rejected = (message: string): Rejected => Rejected.make({ message });
