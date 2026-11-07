import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { AnyRoute, Router } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

const createAppRouter = <Tree extends AnyRoute>(routeTree: Tree): Router<Tree> => {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultViewTransition: true,
  });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
};

export { createAppRouter };
