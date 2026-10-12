import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { RootDocument } from "#/app/shell/root-document";
import { site } from "#/shared/config";

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
      { property: "og:locale", content: "ja_JP" },
      { property: "og:image", content: site.ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: site.xHandle },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "alternate", type: "application/rss+xml", title: site.name, href: "/feed.xml" },
    ],
  }),
  shellComponent: RootDocument,
});

export { Route };
