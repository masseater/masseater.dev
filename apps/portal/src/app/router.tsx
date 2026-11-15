import { createQueryRouter } from "@masseater.dev/start-shell/query-router";
import type { Router } from "@tanstack/react-router";

import { FRESH } from "#/shared/config";

import { routeTree } from "./routeTree.gen";

export type AppRouter = Router<typeof routeTree>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

export const getRouter = (): AppRouter => {
  const router = createQueryRouter(routeTree);
  router.options.context.queryClient.setDefaultOptions({ queries: FRESH });
  return router;
};
