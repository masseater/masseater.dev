import { Schema } from "effect";

const Utterance = Schema.Struct({
  uuid: Schema.String,
  timestamp: Schema.String,
  text: Schema.String,
});

const Conversation = Schema.Struct({
  sessionId: Schema.String,
  cursor: Schema.Int,
  utterances: Schema.Array(Utterance),
  nextCursor: Schema.optionalKey(Schema.Int),
});

type ConversationValue = typeof Conversation.Type;

type UtteranceValue = typeof Utterance.Type;

export { Conversation };
export type { ConversationValue, UtteranceValue };
