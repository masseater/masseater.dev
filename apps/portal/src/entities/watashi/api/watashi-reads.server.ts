import { Effect } from "effect";

import { Conversation } from "#/entities/watashi/model/conversation.ts";
import type { ConversationValue } from "#/entities/watashi/model/conversation.ts";
import { LifePage } from "#/entities/watashi/model/life-item.ts";
import { Revisions } from "#/entities/watashi/model/memo-input.ts";
import type { MemoKeyValue, RevisionValue } from "#/entities/watashi/model/memo-input.ts";
import { MemoList } from "#/entities/watashi/model/memo.ts";
import type { MemoValue } from "#/entities/watashi/model/memo.ts";
import { PersonalTimeline, mergeTimeline } from "#/entities/watashi/model/timeline.ts";
import type { TimelineEntry } from "#/entities/watashi/model/timeline.ts";
import type { PortalFailed, Upstreams } from "#/shared/api/index.server.ts";
import { jsonBody, personal, rpcBody } from "#/shared/api/index.server.ts";

const LIFE_EVENTS = { record: "life_event", order: "time", limit: 1000 } as const;

const OWNER_VIEW = "owner";

export const timeline: Effect.Effect<readonly TimelineEntry[], PortalFailed, Upstreams> =
  Effect.all(
    {
      events: jsonBody({ schema: PersonalTimeline, call: personal("/timeline.json") }),
      life: rpcBody({ schema: LifePage, call: ({ WATASHI }) => WATASHI.lifeRead(LIFE_EVENTS) }),
    },
    { concurrency: "unbounded" },
  ).pipe(Effect.map(({ events, life }) => mergeTimeline({ personal: events, life: life.items })));

export const memoDetail = (
  key: MemoKeyValue,
): Effect.Effect<
  Readonly<{ memo: readonly MemoValue[]; revisions: readonly RevisionValue[] }>,
  PortalFailed,
  Upstreams
> =>
  Effect.all(
    {
      found: rpcBody({ schema: MemoList, call: ({ WATASHI }) => WATASHI.memoryRead(key) }),
      history: rpcBody({
        schema: Revisions,
        call: ({ WATASHI }) => WATASHI.memoryRead({ ...key, revisions: true }),
      }),
    },
    { concurrency: "unbounded" },
  ).pipe(Effect.map(({ found, history }) => ({ memo: found.items, revisions: history.revisions })));

export const conversation = (
  page: Readonly<{ sessionId: string; cursor?: number }>,
): Effect.Effect<ConversationValue, PortalFailed, Upstreams> =>
  rpcBody({
    schema: Conversation,
    call: ({ WATASHI }) => WATASHI.conversationRead({ ...page, view: OWNER_VIEW }),
  });
