import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { Option } from "effect";
import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

export type BuildInput =
  | string
  | { readonly pattern: string; readonly base: "workspace" }
  | { readonly auto: true };

export interface SiteOptions {
  readonly basePath: string;
  readonly searchIndexOrigin: Option.Option<string>;
  readonly assetHeaderArgs: string;
  readonly locked: readonly BuildInput[];
}

const SITEMAP_FILE = "sitemap.xml";

export const startSiteConfig = ({
  basePath,
  searchIndexOrigin,
  assetHeaderArgs,
  locked,
}: SiteOptions): UserConfig =>
  defineConfig({
    base: `${basePath}/`,
    run: {
      tasks: {
        dev: { command: "alchemy dev", cache: false },
        build: {
          command: `vp build && write-asset-headers ${assetHeaderArgs}`,
          cache: { input: [...locked] },
        },
        deploy: { command: "alchemy deploy", cache: false },
        "deploy:production": {
          command: "alchemy deploy --stage production --yes",
          cache: false,
        },
        destroy: { command: "alchemy destroy", cache: false },
      },
    },
    preview: { host: "127.0.0.1" },
    environments: { client: { build: { outDir: `dist/client${basePath}` } } },
    test: {
      projects: [
        { extends: false, test: { name: "app", include: ["src/**/*.test.{ts,tsx}"] } },
        { extends: false, test: { name: "alchemy", include: ["*.test.ts"] } },
      ],
    },
    plugins: [
      devtools(),
      tailwindcss(),
      tanstackStart({
        srcDirectory: "src/app",
        rsc: { enabled: true },
        prerender: { enabled: true, crawlLinks: true },
        pages: [{ path: "/" }],
        sitemap: Option.match(searchIndexOrigin, {
          onNone: () => ({ enabled: false }),
          onSome: (host) => ({ host, outputPath: SITEMAP_FILE }),
        }),
      }),
      rsc(),
      viteReact(),
    ],
  });
