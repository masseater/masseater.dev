import { run } from "@r_masseater/workers-tracing/effect";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api";

import type { SlidesRoutes } from "./slides-routes.server";

const loadSlidesHandle = (): Promise<(request: Request) => Promise<Response>> =>
  run(
    Effect.promise(() => import("./handle.server")).pipe(
      Effect.map((module) => module.handleSlides),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<SlidesRoutes>(loadSlidesHandle))
  .client(() => browserClient<SlidesRoutes>());

const slidesQueries = createQueries<SlidesRoutes>(client()).api.slides;

export { slidesQueries };
