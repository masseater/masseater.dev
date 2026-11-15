import { Schema } from "effect";

const Utterance = Schema.Struct({
  uuid: Schema.String,
  timestamp: Schema.String,
  text: Schema.String,
});

export const Conversation = Schema.Struct({
  sessionId: Schema.String,
  cursor: Schema.Int,
  utterances: Schema.Array(Utterance),
  nextCursor: Schema.optionalKey(Schema.Int),
});

export type ConversationValue = typeof Conversation.Type;

export type UtteranceValue = typeof Utterance.Type;
