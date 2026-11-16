import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class PlayerFailed extends taggedError<PlayerFailed, { readonly brand: unique symbol }>()(
  "PlayerFailed",
  { message: Schema.String },
) {}

export const playerFailed = (cause: unknown): PlayerFailed =>
  PlayerFailed.make({ message: String(cause) });
