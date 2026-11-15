import { alchemyTasks } from "@masseater.dev/cloudflare-account/alchemy-tasks";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { rpp } from "rpp-kit/vite";
import { defineConfig } from "vite-plus";

import { gzipTscWasm } from "./gzip-tsc-wasm.ts";
import { externalizeInlineScripts } from "./inline-scripts.ts";

export default defineConfig({
  run: {
    tasks: {
      ...alchemyTasks,
      verify: { command: [], dependsOn: ["typecheck"] },
      typecheck: "tsc --runExternalCode",
    },
  },
  resolve: { tsconfigPaths: true },
  test: { include: ["*.test.ts"] },
  plugins: [
    rpp(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/app",
      prerender: { enabled: true, crawlLinks: true, failOnError: true },
    }),
    viteReact(),
    externalizeInlineScripts(),
    gzipTscWasm(),
  ],
});
