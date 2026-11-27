import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen.ts";

export type AppRouter = ReturnType<typeof createRouter<typeof routeTree>>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

export const getRouter = (): AppRouter => createRouter({ routeTree });
