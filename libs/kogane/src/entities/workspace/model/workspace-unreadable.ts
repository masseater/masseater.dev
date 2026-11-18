import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class WorkspaceUnreadable extends taggedError<
  WorkspaceUnreadable,
  { readonly brand: unique symbol }
>()("WorkspaceUnreadable", { cause: Schema.Defect() }) {}
