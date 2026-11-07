import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class TodoNotFound extends taggedError<TodoNotFound, { readonly brand: unique symbol }>()(
  "TodoNotFound",
  { todoId: Schema.Int },
) {}

export { TodoNotFound };
