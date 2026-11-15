import { Effect } from "effect";
import { HttpClientRequest } from "effect/http";
import type { HttpClient } from "effect/http";

import { SESSIONS_PATH, SessionRecord } from "#protocol";
import type { RecordedSession } from "#protocol";

import { InterviewerFailed, send } from "./interviewer.ts";

/** @internal */
export const saveSession = ({
  id,
  record,
}: Readonly<{ id: string; record: RecordedSession }>): Effect.Effect<
  void,
  InterviewerFailed,
  HttpClient.HttpClient
> =>
  HttpClientRequest.put(`${SESSIONS_PATH}/${id}`).pipe(
    HttpClientRequest.schemaBodyJson(SessionRecord)(record),
    Effect.flatMap(send),
    Effect.asVoid,
    Effect.mapError((cause) => InterviewerFailed.make({ message: String(cause) })),
  );
