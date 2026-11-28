import { alchemyTasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { lapse } from "lapse";
import { rpp } from "rpp-kit/vite";
import { defineConfig } from "vite-plus";

import { gzipTscWasm } from "./src/app/vite/gzip-tsc-wasm.ts";
import { externalizeInlineScripts } from "./src/app/vite/inline-scripts.ts";

export default defineConfig({
  run: {
    tasks: {
      ...alchemyTasks,
      "deploy:production": {
        command: [deployTo("production").command, "web-vitals-flow https://masseater.dev/rpp-kit/"],
        cache: false,
      },
      verify: { command: [], dependsOn: ["typecheck"] },
      typecheck: "tsc --runExternalCode",
    },
  },
  preview: { host: "127.0.0.1" },
  test: { include: ["src/**/*.test.ts"] },
  plugins: [
    lapse(),
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
