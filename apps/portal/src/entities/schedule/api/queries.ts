import { run } from "@r_masseater/workers-tracing/effect";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api/index.ts";

import type { SchedulesRoutes } from "./schedules-routes.server.ts";

const loadSchedulesHandle = (): Promise<(request: Request) => Promise<Response>> =>
  run(
    Effect.promise(() => import("./handle.server.ts")).pipe(
      Effect.map((module) => module.handleSchedules),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<SchedulesRoutes>(loadSchedulesHandle))
  .client(() => browserClient<SchedulesRoutes>());

export const schedulesQueries = createQueries<SchedulesRoutes>(client()).api.schedules;
