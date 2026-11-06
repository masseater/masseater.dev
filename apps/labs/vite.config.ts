import { Array as Arr, Record as Rec, pipe } from "effect";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vite-plus";

import { labHeaders } from "./lab-headers.ts";
import { ASSETS_DIR, PAGES } from "./pages.ts";

const pagePath = (page: string): string =>
  decodeURIComponent(new URL(`pages/${page}/index.html`, import.meta.url).pathname);

export default defineConfig({
  run: {
    tasks: {
      deploy: { command: "alchemy deploy", cache: false },
      destroy: { command: "alchemy destroy", cache: false },
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
