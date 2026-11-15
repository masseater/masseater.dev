import { Schema } from "effect";

import { LifePage } from "#/entities/watashi/model/life-item";
import { MemoList, MemoProjects } from "#/entities/watashi/model/memo";
import { MemoChange, MemoKey, Written } from "#/entities/watashi/model/memo-input";
import { Profile } from "#/entities/watashi/model/profile";
import { CursorQuery, MemosSearch, RecordsSearch } from "#/entities/watashi/model/search";
import { Sessions } from "#/entities/watashi/model/session";
import { createRouter, respond, rpcBody, watashi } from "#/shared/api/index.server";

import { memosInput, recordsInput } from "./inputs";
import { conversation, memoDetail, timeline } from "./watashi-reads.server";

const RECENT_SESSIONS = { limit: 100 } as const;

export const watashiRoutes = createRouter("/api/watashi")
  .get("/timeline", () => respond(timeline))
  .get(
    "/records",
    ({ query }) =>
      respond(rpcBody({ schema: LifePage, call: () => watashi().lifeRead(recordsInput(query)) })),
    { query: Schema.toStandardSchemaV1(RecordsSearch) },
  )
  .get(
    "/memos",
    ({ query }) =>
      respond(rpcBody({ schema: MemoList, call: () => watashi().memoryRead(memosInput(query)) })),
    { query: Schema.toStandardSchemaV1(MemosSearch) },
  )
  .post(
    "/memos",
    ({ body }) => respond(rpcBody({ schema: Written, call: () => watashi().memoryWrite(body) })),
    { body: Schema.toStandardSchemaV1(MemoChange) },
  )
  .get("/memo-projects", () =>
    respond(rpcBody({ schema: MemoProjects, call: () => watashi().memoryProjects() })),
  )
  .get("/memos/:project/:name", ({ params }) => respond(memoDetail(params)), {
    params: Schema.toStandardSchemaV1(MemoKey),
  })
  .get("/profile", () => respond(rpcBody({ schema: Profile, call: () => watashi().profile() })))
  .get("/conversations", () =>
    respond(rpcBody({ schema: Sessions, call: () => watashi().conversationRead(RECENT_SESSIONS) })),
  )
  .get(
    "/conversations/:sessionId",
    ({ params, query }) => respond(conversation({ ...query, sessionId: params.sessionId })),
    { query: Schema.toStandardSchemaV1(CursorQuery) },
  );

export type WatashiRoutes = typeof watashiRoutes;
