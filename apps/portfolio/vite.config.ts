import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite-plus";

import { clientAssets } from "./vite-plugins/client-assets.ts";
import mdx from "./vite-plugins/markdown/mdx.config.ts";
import { pages, sitemap, withLastmod } from "./vite-plugins/prerender.ts";
import { seikinTechniques } from "./vite-plugins/seikin/seikin-techniques.ts";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
  plugins: [
    devtools(),
    ...seikinTechniques(),
    mdx,
    tailwindcss(),
    ...clientAssets(),
    tanstackStart({
      srcDirectory: "src/app",
      router: { routeTreeFileHeader: [] },
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
