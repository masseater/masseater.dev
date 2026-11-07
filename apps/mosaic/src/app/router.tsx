import { createQueryRouter } from "@masseater.dev/start-shell/query-router";
import type { Router } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

type AppRouter = Router<typeof routeTree>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

const getRouter = (): AppRouter => createQueryRouter(routeTree);

export type { AppRouter };
export { getRouter };
