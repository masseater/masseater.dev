import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class PlayerFailed extends taggedError<PlayerFailed, { readonly brand: unique symbol }>()(
  "PlayerFailed",
  { message: Schema.String },
) {}

const playerFailed = (cause: unknown): PlayerFailed =>
  PlayerFailed.make({ message: String(cause) });

export { PlayerFailed, playerFailed };
