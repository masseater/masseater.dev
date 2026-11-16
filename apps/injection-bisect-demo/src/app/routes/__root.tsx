import { rootHead } from "@masseater.dev/web-ui";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { RootDocument } from "#/app/shell/root-document.tsx";
import { SEARCH_INDEX_ORIGIN } from "#/shared/config/index.ts";

import appCss from "#/app/styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () =>
    rootHead({
      title: "web",
      stylesheet: appCss,
      searchIndexOrigin: SEARCH_INDEX_ORIGIN,
      webAnalyticsToken: import.meta.env["VITE_CF_BEACON_TOKEN"],
    }),
  shellComponent: RootDocument,
});
