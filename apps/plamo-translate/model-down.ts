import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class ModelDown extends taggedError<ModelDown, { readonly brand: unique symbol }>()(
  "ModelDown",
  {
    message: Schema.String,
  },
) {}

export const down = (cause: unknown): ModelDown => ModelDown.make({ message: String(cause) });
