import { alchemyTasks, d1Tasks } from "@masseater.dev/cloudflare-account/run-tasks";
import { defineConfig } from "vite-plus";

import { portfolioPlugins } from "./vite-plugins/plugins.ts";

export default defineConfig({
  msch: {
    lint: {
      overrides: [
        { files: ["src/**/*.{ts,tsx}"], use: ["decision"] },
        {
          files: ["src/features/dance-stage/lib/gpu-setup.ts"],
          rules: {
            "baseline-js/use-baseline": [
              "error",
              {
                available: "widely",
                includeWebApis: { preset: "auto" },
                includeJsBuiltins: { preset: "auto" },
                ignoreFeatures: ["webgpu"],
              },
            ],
          },
        },
        {
          files: ["worker/**/*.ts", "src/**/*.server.ts"],
          excludeFiles: ["**/*.test.ts"],
          use: ["traced"],
        },
      ],
    },
  },
  run: {
    tasks: {
      ...alchemyTasks,
      build: "vp build && sequoia inject",
      ...d1Tasks,
      "standard-site": { command: "vpx scripts/standard-site.ts && sequoia publish", cache: false },
      "technique-examples": { command: "vpx scripts/technique-examples.ts", cache: false },
    },
  },
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.{ts,tsx}", "vite-plugins/**/*.test.ts", "worker/**/*.test.ts"] },
  plugins: portfolioPlugins(),
});
