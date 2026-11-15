import { Effect, Option } from "effect";

import type { ToolFailure } from "#/shared/api";
import {
  ReadInput,
  listConversations,
  listRequestOf,
  readConversation,
  readRequestOf,
} from "#/entities/conversation/index.server";
import type { Input } from "#/entities/conversation/index.server";

import { decoded } from "./portal-decode";

const conversationOf = (value: Input): Effect.Effect<unknown, ToolFailure> =>
  Option.match(Option.fromUndefinedOr(value.sessionId), {
    onNone: () =>
      listConversations(listRequestOf(value)).pipe(Effect.map((sessions) => ({ sessions }))),
    onSome: (sessionId) => readConversation(readRequestOf({ input: value, sessionId })),
  });

const conversationRead = (input: unknown): Effect.Effect<unknown, ToolFailure> =>
  decoded(ReadInput)(input).pipe(Effect.flatMap(conversationOf));

export { conversationRead };
