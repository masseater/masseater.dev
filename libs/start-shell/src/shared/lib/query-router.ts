import { QueryClient } from "@tanstack/react-query";
import {
  createRouter,
  defaultParseSearch,
  defaultStringifySearch,
  stringifySearchWith,
} from "@tanstack/react-router";
import type { AnyRoute, RouterOptions } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { Record } from "effect";

type SearchCodec = Readonly<{
  parseSearch: typeof defaultParseSearch;
  stringifySearch: typeof defaultStringifySearch;
}>;

const parseText: SearchCodec["parseSearch"] = (searchStr) =>
  Record.fromEntries(new URLSearchParams(searchStr));

const JSON_SEARCH: SearchCodec = {
  parseSearch: defaultParseSearch,
  stringifySearch: defaultStringifySearch,
};

const TEXT_SEARCH: SearchCodec = {
  parseSearch: parseText,
  stringifySearch: stringifySearchWith(JSON.stringify),
};

export type RouterExtras = Pick<
  RouterOptions<AnyRoute, "never">,
  "defaultNotFoundComponent" | "defaultViewTransition"
>;

const routerWith =
  ({ parseSearch, stringifySearch }: SearchCodec) =>
  (extras: RouterExtras) =>
  <TRouteTree extends AnyRoute>(
    routeTree: TRouteTree,
  ): ReturnType<typeof createRouter<TRouteTree>> => {
    const queryClient = new QueryClient();
    const router = createRouter({
      routeTree,
      context: { queryClient },
      scrollRestoration: true,
      defaultPreload: "intent",
      defaultPreloadStaleTime: 0,
      parseSearch,
      stringifySearch,
      ...extras,
    });
    setupRouterSsrQueryIntegration({ router, queryClient });
    return router;
  };

export const queryRouterWith = routerWith(JSON_SEARCH);

export const createQueryRouter = queryRouterWith({});

export const createTextSearchRouter = routerWith(TEXT_SEARCH)({});
