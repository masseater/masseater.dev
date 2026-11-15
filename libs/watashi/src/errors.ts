import { Schema } from "effect";
import type { HttpBody, HttpClientError } from "effect/http";

const taggedError = Schema.TaggedError;

const REASONS = ["NotLoggedIn", "Api", "Betterleaks", "Masking", "Login", "Conflicts"] as const;

export class WatashiFailed extends taggedError<WatashiFailed, { readonly brand: unique symbol }>()(
  "WatashiFailed",
  { reason: Schema.Literals(REASONS), message: Schema.String },
  { identifier: "WatashiFailed" },
) {}

export type JsonError =
  | WatashiFailed
  | HttpClientError.HttpClientError
  | HttpBody.HttpBodyError
  | Schema.SchemaError;

/** @internal */
/** @internal */
