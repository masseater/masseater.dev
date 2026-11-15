import { run } from "@r_masseater/workers-tracing/effect";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api";

import type { WatashiRoutes } from "./watashi-routes.server";

const loadWatashiHandle = (): Promise<(request: Request) => Promise<Response>> =>
  run(
    Effect.promise(() => import("./handle.server")).pipe(
      Effect.map((module) => module.handleWatashi),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<WatashiRoutes>(loadWatashiHandle))
  .client(() => browserClient<WatashiRoutes>());

const watashiQueries = createQueries<WatashiRoutes>(client()).api.watashi;

export { watashiQueries };
