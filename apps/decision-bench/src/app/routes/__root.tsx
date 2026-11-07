import { RootDocument, rootHead } from "@masseater.dev/web-ui";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { SEARCH_INDEX_ORIGIN, SITE_TITLE } from "#/shared/config";

import appCss from "#/app/styles.css?url";

const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () =>
    rootHead({
      title: SITE_TITLE,
      stylesheet: appCss,
      searchIndexOrigin: SEARCH_INDEX_ORIGIN,
      webAnalyticsToken: import.meta.env["VITE_CF_BEACON_TOKEN"],
    }),
  shellComponent: RootDocument,
});

export { Route };
