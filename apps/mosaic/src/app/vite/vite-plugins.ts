import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { CHARACTERS } from "@thumb-mosaic/mosaic";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { Array as Arr, Option, pipe } from "effect";
import type { PluginOption } from "vite-plus";

import { SEARCH_INDEX_ORIGIN } from "#/shared/config/search.ts";

const SITEMAP_FILE = "sitemap.xml";

const characterPages = pipe(
  CHARACTERS,
  Arr.flatMap(({ slug }) => [{ path: `/${slug}` }, { path: `/${slug}/credits` }]),
);

export const mosaicPlugins = (): PluginOption[] => [
  devtools(),
  tailwindcss(),
  tanstackStart({
    srcDirectory: "src/app",
    router: { routeTreeFileHeader: [] },
    rsc: { enabled: true },
    prerender: { enabled: true, crawlLinks: false, autoSubfolderIndex: false },
    pages: [{ path: "/" }, ...characterPages],
    spa: {
      enabled: true,
      maskPath: "/404",
      prerender: { outputPath: "/404", crawlLinks: false },
    },
    sitemap: Option.match(SEARCH_INDEX_ORIGIN, {
      onNone: () => ({ enabled: false }),
      onSome: (host) => ({ host, outputPath: SITEMAP_FILE }),
    }),
  }),
  rsc(),
  viteReact(),
];
