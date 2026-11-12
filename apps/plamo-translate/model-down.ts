import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class ModelDown extends taggedError<ModelDown, { readonly brand: unique symbol }>()("ModelDown", {
  message: Schema.String,
}) {}

const down = (cause: unknown): ModelDown => ModelDown.make({ message: String(cause) });

export { ModelDown, down };
