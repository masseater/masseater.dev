import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class RequestFailed extends taggedError<RequestFailed, { readonly brand: unique symbol }>()(
  "RequestFailed",
  {
    reason: Schema.Literals(["NotFound", "Failed"]),
    message: Schema.String,
  },
  { identifier: "RequestFailed" },
) {}

export { RequestFailed };
