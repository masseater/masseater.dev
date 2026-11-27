import { createQueryRouter } from "@masseater.dev/start-shell/query-router";

import { routeTree } from "./routeTree.gen.ts";

export type AppRouter = ReturnType<typeof createQueryRouter<typeof routeTree>>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

export const getRouter = (): AppRouter => createQueryRouter(routeTree);
