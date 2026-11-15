import { Effect, Option } from "effect";

import { listSessions, readConversation } from "#/entities/conversation/index.server.ts";
import { ReadInput, listRequestOf, readRequestOf } from "#/entities/conversation/index.ts";
import type { Input } from "#/entities/conversation/index.ts";
import type { ToolFailure } from "#/shared/api/index.ts";

import { decoded } from "./portal-decode";

const conversationOf = (value: Input): Effect.Effect<unknown, ToolFailure> =>
  Option.match(Option.fromUndefinedOr(value.sessionId), {
    onNone: () => listSessions(listRequestOf(value)).pipe(Effect.map((sessions) => ({ sessions }))),
    onSome: (sessionId) => readConversation(readRequestOf({ input: value, sessionId })),
  });

export const conversationRead = (input: unknown): Effect.Effect<unknown, ToolFailure> =>
  decoded(ReadInput)(input).pipe(Effect.flatMap(conversationOf));
