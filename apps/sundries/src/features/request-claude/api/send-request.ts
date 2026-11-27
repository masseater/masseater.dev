import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Effect } from "effect";

import { enqueue } from "./claude-requests.ts";
import type { NewRequest, RequestsDb } from "./claude-requests.ts";
import { wakeProject } from "./claude-routine.ts";
import type { RoutineService, Woken } from "./claude-routine.ts";

export const sendRequest = (
  request: NewRequest,
): Effect.Effect<
  Readonly<{ id: number; woke: Woken }>,
  UpstreamFailed,
  RequestsDb | RoutineService
> => enqueue(request).pipe(Effect.zipWith(wakeProject, ({ id }, woke) => ({ id, woke })));
