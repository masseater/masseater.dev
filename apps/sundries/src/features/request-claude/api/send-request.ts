import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Effect, Match } from "effect";

import { delivered, enqueue } from "./claude-requests.ts";
import type { NewRequest, RequestsDb } from "./claude-requests.ts";
import { wakeProject } from "./claude-routine.ts";
import type { RoutineService, Woken } from "./claude-routine.ts";

const noticeOf = (id: number): string =>
  `（sundries の依頼 id: ${id}。着手したら MCP ポータルの sundries_reply_to_request で、この id とこのスレッドの URL を返信する。）`;

export const sendRequest = (
  request: NewRequest,
): Effect.Effect<
  Readonly<{ id: number; woke: Woken }>,
  UpstreamFailed,
  RequestsDb | RoutineService
> =>
  enqueue(request).pipe(
    Effect.flatMap(({ id }) =>
      wakeProject(`${request.text}\n\n${noticeOf(id)}`).pipe(
        Effect.tap((woke) =>
          Match.value(woke).pipe(
            Match.when("fired", () => delivered(id)),
            Match.orElse(() => Effect.void),
          ),
        ),
        Effect.map((woke) => ({ id, woke })),
      ),
    ),
  );
