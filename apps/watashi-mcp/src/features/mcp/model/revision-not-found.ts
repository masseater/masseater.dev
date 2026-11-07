import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class RevisionNotFound extends taggedError<RevisionNotFound, { readonly brand: unique symbol }>()(
  "RevisionNotFound",
  { entity: Schema.String, entityId: Schema.String, rev: Schema.Int },
) {}

export { RevisionNotFound };
