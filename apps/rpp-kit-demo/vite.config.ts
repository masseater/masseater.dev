import { alchemyTasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { rpp } from "rpp-kit/vite";
import { defineConfig } from "vite-plus";

import { gzipTscWasm } from "./src/app/vite/gzip-tsc-wasm.ts";
import { externalizeInlineScripts } from "./src/app/vite/inline-scripts.ts";

export default defineConfig({
  run: {
    tasks: {
      ...alchemyTasks,
      "deploy:production": deployTo("production"),
      verify: { command: [], dependsOn: ["typecheck"] },
      typecheck: "tsc --runExternalCode",
    },
  },
  test: { include: ["src/**/*.test.ts"] },
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
