import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite-plus";

import mdx from "./mdx.config.ts";
import { categories, categoryPath } from "./src/entities/entry/model/category.ts";
import { site } from "./src/shared/config/site.ts";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      { extends: true, test: { name: "app", include: ["src/**/*.test.{ts,tsx}"] } },
      { extends: false, test: { name: "alchemy", include: ["*.test.ts"] } },
    ],
  },
  plugins: [
    devtools(),
    mdx,
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/app",
      rsc: { enabled: true },
      prerender: { enabled: true, crawlLinks: true },
      pages: [
        ...["/", ...categories.map((category) => categoryPath(category))].map((path) => ({ path })),
        ...[site.feedPath, site.robotsPath].map((path) => ({ path, sitemap: { exclude: true } })),
        ...site.externalPaths.map((path) => ({ path, prerender: { enabled: false } })),
      ],
      sitemap: { host: site.url, outputPath: site.sitemapFile },
      spa: {
        enabled: true,
        maskPath: "/404",
        prerender: { outputPath: "/404", crawlLinks: false },
      },
    }),
    rsc(),
    viteReact({ include: /\.(?:md|tsx?)$/u }),
  ],
});
