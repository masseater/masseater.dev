import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { Array as Arr, Option, Schema, pipe } from "effect";

import { RootDocument } from "#/app/shell/root-document";
import { RootLayout } from "#/app/shell/root-layout";
import { RootNotFound } from "#/app/shell/root-not-found";
import { site, webAnalyticsBeacon } from "#/shared/config";

import appCss from "#/app/styles.css?url";

const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: site.name },
      { name: "description", content: site.description },
      { name: "color-scheme", content: "light" },
      { property: "og:site_name", content: site.name },
      { property: "og:locale", content: site.ogLocale },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: site.xHandle },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "alternate", type: "application/rss+xml", title: site.name, href: site.feedPath },
    ],
    scripts: pipe(
      Schema.decodeUnknownOption(Schema.NonEmptyString)(import.meta.env["VITE_CF_BEACON_TOKEN"]),
      Option.map(webAnalyticsBeacon),
      Arr.fromOption,
    ),
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: RootNotFound,
});

export { Route };
