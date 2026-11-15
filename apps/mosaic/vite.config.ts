import { alchemyTasks } from "@masseater.dev/cloudflare-account/run-tasks";
import { defineConfig } from "vite-plus";

import { BASE_PATH } from "./base-path.ts";
import { mosaicPlugins } from "./vite-plugins.ts";

export default defineConfig({
  msch: {
    lint: {
      overrides: [
        {
          files: ["src/entities/mosaic/lib/gpu-device.ts"],
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
      build: { command: "vp build && node bin/write-asset-headers.ts", cache: false },
      "deploy:production": {
        command: ["node bin/live.ts", "alchemy deploy --stage production --yes"],
        cache: false,
      },
      "daily:after": { command: [], dependsOn: ["deploy:production"] },
      "deploy:mosaic-files": { command: "alchemy deploy alchemy.files.ts --yes", cache: false },
    },
  },
  base: `${BASE_PATH}/`,
  build: { copyPublicDir: false },
  test: { include: ["src/**/*.test.{ts,tsx}", "bin/lib/*.test.ts", "*.test.ts"] },
  plugins: mosaicPlugins(),
});
