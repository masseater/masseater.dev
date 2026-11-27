import { QueryClient } from "@tanstack/react-query";
import { createRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router";
import type { AnyRoute, Router } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

const keepText = (text: string): string => text;

const TEXT_SEARCH = {
  parseSearch: parseSearchWith(keepText),
  stringifySearch: stringifySearchWith(JSON.stringify),
} as const;

const JSON_SEARCH = {} as const;

export const createQueryRouter = <TRouteTree extends AnyRoute>(
  routeTree: TRouteTree,
  { textSearch = false }: Readonly<{ textSearch?: boolean }> = {},
): Router<TRouteTree> => {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    ...(textSearch ? TEXT_SEARCH : JSON_SEARCH),
  });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
};
