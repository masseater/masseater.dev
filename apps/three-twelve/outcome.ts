import { Schema } from "effect";

const Guild = { guildId: Schema.String, guildName: Schema.String };

const Played = Schema.Struct({
  status: Schema.Literal("played"),
  ...Guild,
  channelName: Schema.String,
  listeners: Schema.Finite,
});

const Empty = Schema.Struct({ status: Schema.Literal("empty"), ...Guild });

const Failed = Schema.Struct({
  status: Schema.Literal("failed"),
  ...Guild,
  channelName: Schema.String,
  reason: Schema.String,
});

const Outcomes = Schema.Array(Schema.Union([Played, Empty, Failed]));

export { Outcomes };
