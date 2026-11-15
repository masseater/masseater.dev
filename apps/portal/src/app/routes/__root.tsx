import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { RootDocument } from "#/app/shell/root-document.tsx";
import { RouteError } from "#/app/shell/route-error.tsx";
import { readSidebarOpen } from "#/shared/api/index.ts";
import { SITE_NAME } from "#/shared/config/index.ts";

import appCss from "#/app/styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => readSidebarOpen(),
  head: () => ({
    meta: [
      { charSet: "utf8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: "noindex" },
      { title: SITE_NAME },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  staleTime: Number.POSITIVE_INFINITY,
  shellComponent: RootDocument,
  errorComponent: RouteError,
});
