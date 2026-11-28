import { queryRouterWith } from "@masseater.dev/start-shell/query-router";
import type { createRouter } from "@tanstack/react-router";

import { NotFound } from "#/widgets/not-found/index.ts";

import { routeTree } from "./routeTree.gen.ts";
import { transitionTypes } from "./transition-types.ts";

export type AppRouter = ReturnType<typeof createRouter<typeof routeTree>>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

export const getRouter = (): AppRouter =>
  queryRouterWith({
    defaultNotFoundComponent: NotFound,
    defaultViewTransition: { types: transitionTypes },
  })(routeTree);
