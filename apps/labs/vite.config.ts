import { alchemyTasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import { Array as Arr, Record as Rec, pipe } from "effect";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vite-plus";

import { labHeaders } from "./src/app/vite/lab-headers.ts";
import { ASSETS_DIR, PAGES } from "./src/shared/config/pages.ts";

const pagePath = (page: string): string =>
  decodeURIComponent(new URL(`pages/${page}/index.html`, import.meta.url).pathname);

export default defineConfig({
  run: {
    tasks: {
      ...alchemyTasks,
      "deploy:bootstrap": deployTo("prod"),
    },
  },
  root: "pages",
  publicDir: "../public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: ASSETS_DIR,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: pipe(
        PAGES,
        Arr.map((page): readonly [string, string] => [page, pagePath(page)]),
        Rec.fromEntries,
      ),
    },
  },
  plugins: [
    labHeaders(),
    viteStaticCopy({
      targets: [
        {
          src: "../node_modules/@webxr-input-profiles/assets/dist/profiles/generic-hand/*.glb",
          dest: "split-pad/webxr-input-profiles/dist/profiles/generic-hand",
          rename: { stripBase: true },
        },
      ],
    }),
  ],
});
