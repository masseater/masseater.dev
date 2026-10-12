import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite-plus";

import mdx from "./mdx.config.ts";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    mdx,
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/app",
      rsc: { enabled: true },
      prerender: { enabled: true, crawlLinks: true },
      pages: ["/", "/projects", "/blogs", "/scraps", "/feed.xml"].map((path) => ({
        path,
      })),
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
