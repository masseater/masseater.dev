import { createTextSearchRouter } from "@masseater.dev/start-shell/query-router";

import { FRESH } from "#/shared/config/index.ts";

import { routeTree } from "./routeTree.gen.ts";

export type AppRouter = ReturnType<typeof createTextSearchRouter<typeof routeTree>>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

export const getRouter = (): AppRouter => {
  const router = createTextSearchRouter(routeTree);
  router.options.context.queryClient.setDefaultOptions({ queries: FRESH });
  return router;
};
