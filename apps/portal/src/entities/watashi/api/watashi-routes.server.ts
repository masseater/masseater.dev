import { Schema } from "effect";

import { LifePage } from "#/entities/watashi/model/life-item.ts";
import { MemoChange, MemoKey, Written } from "#/entities/watashi/model/memo-input.ts";
import { MemoList, MemoProjects, MemoViews } from "#/entities/watashi/model/memo.ts";
import { Profile } from "#/entities/watashi/model/profile.ts";
import { CursorQuery, MemosSearch, RecordsSearch } from "#/entities/watashi/model/search.ts";
import { RECENT_SESSION_LIMIT, Sessions } from "#/entities/watashi/model/session.ts";
import { createRouter, respond, rpcBody } from "#/shared/api/index.server.ts";

import { memosInput, recordsInput } from "./inputs.ts";
import { conversation, memoDetail, timeline } from "./watashi-reads.server.ts";

const RECENT_SESSIONS = { limit: RECENT_SESSION_LIMIT } as const;

const WEEKLY = { prefix: "weekly-" } as const;

const JsonBody = Schema.Struct({
  "content-type": Schema.String.check(Schema.isPattern(/^application\/json(?:;|$)/iu)),
});

export const watashiRoutes = createRouter("/api/watashi")
  .get("/timeline", ({ request }) => respond(request)(timeline))
  .get(
    "/records",
    ({ query, request }) =>
      respond(request)(
        rpcBody({ schema: LifePage, call: ({ WATASHI }) => WATASHI.lifeRead(recordsInput(query)) }),
      ),
    { query: Schema.toStandardSchemaV1(RecordsSearch) },
  )
  .get(
    "/memos",
    ({ query, request }) =>
      respond(request)(
        rpcBody({ schema: MemoList, call: ({ WATASHI }) => WATASHI.memoryRead(memosInput(query)) }),
      ),
    { query: Schema.toStandardSchemaV1(MemosSearch) },
  )
  .post(
    "/memos",
    ({ body, request }) =>
      respond(request)(
        rpcBody({ schema: Written, call: ({ WATASHI }) => WATASHI.memoryWrite(body) }),
      ),
    {
      body: Schema.toStandardSchemaV1(MemoChange),
      headers: Schema.toStandardSchemaV1(JsonBody),
    },
  )
  .get("/memo-projects", ({ request }) =>
    respond(request)(
      rpcBody({ schema: MemoProjects, call: ({ WATASHI }) => WATASHI.memoryProjects() }),
    ),
  )
  .get("/memos/:project/:name", ({ params, request }) => respond(request)(memoDetail(params)), {
    params: Schema.toStandardSchemaV1(MemoKey),
  })
  .get("/weeks", ({ request }) =>
    respond(request)(
      rpcBody({ schema: MemoViews, call: ({ WATASHI }) => WATASHI.memoryViews(WEEKLY) }),
    ),
  )
  .get("/profile", ({ request }) =>
    respond(request)(rpcBody({ schema: Profile, call: ({ WATASHI }) => WATASHI.profile() })),
  )
  .get("/conversations", ({ request }) =>
    respond(request)(
      rpcBody({
        schema: Sessions,
        call: ({ WATASHI }) => WATASHI.conversationRead(RECENT_SESSIONS),
      }),
    ),
  )
  .get(
    "/conversations/:sessionId",
    ({ params, query, request }) =>
      respond(request)(conversation({ ...query, sessionId: params.sessionId })),
    { query: Schema.toStandardSchemaV1(CursorQuery) },
  );

export type WatashiRoutes = typeof watashiRoutes;
