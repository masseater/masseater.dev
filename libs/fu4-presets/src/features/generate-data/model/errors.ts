import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class GenerateDataError extends taggedError<
  GenerateDataError,
  { readonly brand: unique symbol }
>()("GenerateDataError", {
  message: Schema.String,
}) {}

export const failedWith =
  (message: string) =>
  (cause: unknown): GenerateDataError =>
    GenerateDataError.make({ message: `${message}: ${String(cause)}` });
