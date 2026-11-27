import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "./routeTree.gen.ts";

export type AppRouter = ReturnType<typeof createRouter<typeof routeTree>>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

export const getRouter = (): AppRouter => {
  const queryClient = new QueryClient();
  const router = createRouter({ routeTree, context: { queryClient }, scrollRestoration: true });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
};
