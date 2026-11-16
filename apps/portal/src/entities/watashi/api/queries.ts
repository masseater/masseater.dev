import { run } from "@r_masseater/workers-tracing/effect";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api/index.ts";

import type { WatashiRoutes } from "./watashi-routes.server.ts";

const loadWatashiHandle = (): Promise<(request: Request) => Promise<Response>> =>
  run(
    Effect.promise(() => import("./handle.server.ts")).pipe(
      Effect.map((module) => module.handleWatashi),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<WatashiRoutes>(loadWatashiHandle))
  .client(() => browserClient<WatashiRoutes>());

export const watashiQueries = createQueries<WatashiRoutes>(client()).api.watashi;
