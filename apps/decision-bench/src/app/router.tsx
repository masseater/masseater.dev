import { createAppRouter } from "@masseater.dev/web-ui";

import { routeTree } from "./routeTree.gen.ts";

export type AppRouter = ReturnType<typeof createAppRouter<typeof routeTree>>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

export const getRouter = (): AppRouter => createAppRouter(routeTree);
