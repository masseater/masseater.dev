import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class DiscordFailed extends taggedError<DiscordFailed, { readonly brand: unique symbol }>()(
  "DiscordFailed",
  { message: Schema.String },
) {}

const discordFailed = (cause: unknown): DiscordFailed =>
  DiscordFailed.make({ message: String(cause) });

export { DiscordFailed, discordFailed };
