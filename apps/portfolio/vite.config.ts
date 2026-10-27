import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite-plus";

import mdx from "./mdx.config.ts";
import { ogImage } from "./og-image.ts";
import { pages, sitemap, withLastmod } from "./prerender.ts";
import { techniqueCatalog } from "./technique-catalog.ts";

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
    techniqueCatalog(),
    mdx,
    tailwindcss(),
    ogImage(),
    tanstackStart({
      srcDirectory: "src/app",
      rsc: { enabled: true },
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: false,
        onSuccess: withLastmod,
      },
      pages,
      sitemap,
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
