import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class DiscordFailed extends taggedError<DiscordFailed, { readonly brand: unique symbol }>()(
  "DiscordFailed",
  { message: Schema.String },
) {}

export const discordFailed = (cause: unknown): DiscordFailed =>
  DiscordFailed.make({ message: String(cause) });
