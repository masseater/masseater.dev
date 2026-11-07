import { run } from "@r_masseater/workers-tracing/effect";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api";

import type { CatalogRoutes } from "./routes.server";

const loadCatalogHandle = (): Promise<(request: Request) => Promise<Response>> =>
  run(
    Effect.promise(() => import("./handle.server")).pipe(
      Effect.map((module) => module.handleCatalog),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<CatalogRoutes>(loadCatalogHandle))
  .client(() => browserClient<CatalogRoutes>());

const catalogQueries = createQueries<CatalogRoutes>(client()).api.catalog;

export { catalogQueries };
