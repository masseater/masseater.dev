import { createFileRoute } from "@tanstack/react-router";

import { site } from "#/shared/config";

const body = [
  "User-agent: *",
  "Allow: /",
  "",
  `Sitemap: ${new URL(site.sitemapFile, site.url).href}`,
  "",
].join("\n");

const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } }),
    },
  },
});

export { Route };
