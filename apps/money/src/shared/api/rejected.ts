import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class Rejected extends taggedError<Rejected, { readonly brand: unique symbol }>()("Rejected", {
  message: Schema.String,
}) {}

const rejected = (message: string): Rejected => Rejected.make({ message });

export { Rejected, rejected };
