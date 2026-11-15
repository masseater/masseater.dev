import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { Option, pipe } from "effect";

import { RootDocument } from "#/app/shell/root-document";
import { RouteError } from "#/app/shell/route-error";
import { readSidebarLayout } from "#/shared/api";
import { SITE_NAME } from "#/shared/config";
import { DEFAULT_SIDEBAR_WIDTH, sidebarWidthRule } from "#/shared/model";

import appCss from "#/app/styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => readSidebarLayout(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: "noindex" },
      { title: SITE_NAME },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    styles: [
      {
        children: pipe(
          Option.fromUndefinedOr(loaderData),
          Option.map((layout) => layout.width),
          Option.getOrElse(() => DEFAULT_SIDEBAR_WIDTH),
          sidebarWidthRule,
        ),
      },
    ],
  }),
  staleTime: Number.POSITIVE_INFINITY,
  shellComponent: RootDocument,
  errorComponent: RouteError,
});
