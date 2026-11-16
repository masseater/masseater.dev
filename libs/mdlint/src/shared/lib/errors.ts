import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class MdlintError extends taggedError<MdlintError, { readonly brand: unique symbol }>()(
  "MdlintError",
  { message: Schema.String },
) {}

export const failedWith =
  (message: string) =>
  (cause: unknown): MdlintError =>
    MdlintError.make({ message: `${message}: ${String(cause)}` });
