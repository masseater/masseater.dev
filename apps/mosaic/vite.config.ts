import { alchemyTasks } from "@masseater.dev/cloudflare-account/run-tasks";
import { defineConfig } from "vite-plus";

import { BASE_PATH } from "./base-path.ts";
import { mosaicPlugins } from "./vite-plugins.ts";

export default defineConfig({
  msch: {
    lint: {
      overrides: [
        {
          files: ["src/pages/mosaic/lib/gpu-device.ts"],
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
      ],
    },
  },
  run: {
    tasks: {
      ...alchemyTasks,
      build: { command: "vp build && node ./write-asset-headers.ts", cache: false },
      "deploy:mosaic-site": {
        command: ["scripts/live.sh", "alchemy deploy --stage production --yes"],
        cache: false,
      },
      "deploy:mosaic-files": { command: "scripts/deploy-files.sh", cache: false },
    },
  },
  base: `${BASE_PATH}/`,
  build: { copyPublicDir: false },
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.{ts,tsx}", "*.test.ts"] },
  plugins: mosaicPlugins(),
});
