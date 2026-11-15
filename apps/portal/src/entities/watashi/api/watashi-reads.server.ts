import { Effect } from "effect";

import { Conversation } from "#/entities/watashi/model/conversation";
import type { ConversationValue } from "#/entities/watashi/model/conversation";
import { LifePage } from "#/entities/watashi/model/life-item";
import { MemoList } from "#/entities/watashi/model/memo";
import type { MemoValue } from "#/entities/watashi/model/memo";
import { Revisions } from "#/entities/watashi/model/memo-input";
import type { MemoKeyValue, RevisionValue } from "#/entities/watashi/model/memo-input";
import { PersonalTimeline, mergeTimeline } from "#/entities/watashi/model/timeline";
import type { TimelineEntry } from "#/entities/watashi/model/timeline";
import type { PortalFailed } from "#/shared/api/index.server";
import { jsonBody, personal, rpcBody, watashi } from "#/shared/api/index.server";

const LIFE_EVENTS = { record: "life_event", order: "time", limit: 1000 } as const;

const OWNER_VIEW = "owner";

export const timeline: Effect.Effect<readonly TimelineEntry[], PortalFailed> = Effect.all(
  {
    events: jsonBody({ schema: PersonalTimeline, call: () => personal("/timeline.json") }),
    life: rpcBody({ schema: LifePage, call: () => watashi().lifeRead(LIFE_EVENTS) }),
  },
  { concurrency: "unbounded" },
).pipe(Effect.map(({ events, life }) => mergeTimeline({ personal: events, life: life.items })));

export const memoDetail = (
  key: MemoKeyValue,
): Effect.Effect<
  Readonly<{ memo: readonly MemoValue[]; revisions: readonly RevisionValue[] }>,
  PortalFailed
> =>
  Effect.all(
    {
      found: rpcBody({ schema: MemoList, call: () => watashi().memoryRead(key) }),
      history: rpcBody({
        schema: Revisions,
        call: () => watashi().memoryRead({ ...key, revisions: true }),
      }),
    },
    { concurrency: "unbounded" },
  ).pipe(Effect.map(({ found, history }) => ({ memo: found.items, revisions: history.revisions })));

export const conversation = (
  page: Readonly<{ sessionId: string; cursor?: number }>,
): Effect.Effect<ConversationValue, PortalFailed> =>
  rpcBody({
    schema: Conversation,
    call: () => watashi().conversationRead({ ...page, view: OWNER_VIEW }),
  });
