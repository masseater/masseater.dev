import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import type { PluginOption } from "vite-plus";

import { clientAssets } from "./client-assets.ts";
import mdx from "./markdown/mdx.config.ts";
import { pages, sitemap, withLastmod } from "./prerender.ts";
import { seikinTechniques } from "./seikin/seikin-techniques.ts";

const portfolioPlugins = (): PluginOption[] => [
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
];

export { portfolioPlugins };
