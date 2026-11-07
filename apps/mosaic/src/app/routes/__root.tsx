import { beaconScripts } from "@masseater.dev/ui/web-analytics";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { RootDocument } from "#/app/shell/root-document";

import appCss from "#/app/styles.css?url";

const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "サムネイルのモザイクアート" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: beaconScripts(import.meta.env["VITE_CF_BEACON_TOKEN"]),
  }),
  shellComponent: RootDocument,
});

export { Route };
