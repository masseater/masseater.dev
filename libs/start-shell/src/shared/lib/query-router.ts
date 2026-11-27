import { QueryClient } from "@tanstack/react-query";
import {
  createRouter,
  defaultParseSearch,
  defaultStringifySearch,
  parseSearchWith,
  stringifySearchWith,
} from "@tanstack/react-router";
import type { AnyRoute, Router } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

type SearchCodec = Readonly<{
  parseSearch: typeof defaultParseSearch;
  stringifySearch: typeof defaultStringifySearch;
}>;

const keepText = (text: string): string => text;

const JSON_SEARCH: SearchCodec = {
  parseSearch: defaultParseSearch,
  stringifySearch: defaultStringifySearch,
};

const TEXT_SEARCH: SearchCodec = {
  parseSearch: parseSearchWith(keepText),
  stringifySearch: stringifySearchWith(JSON.stringify),
};

const routerWith =
  ({ parseSearch, stringifySearch }: SearchCodec) =>
  <TRouteTree extends AnyRoute>(routeTree: TRouteTree): Router<TRouteTree> => {
    const queryClient = new QueryClient();
    const router = createRouter({
      routeTree,
      context: { queryClient },
      scrollRestoration: true,
      defaultPreload: "intent",
      defaultPreloadStaleTime: 0,
      parseSearch,
      stringifySearch,
    });
    setupRouterSsrQueryIntegration({ router, queryClient });
    return router;
  };

export const createQueryRouter = routerWith(JSON_SEARCH);

export const createTextSearchRouter = routerWith(TEXT_SEARCH);
