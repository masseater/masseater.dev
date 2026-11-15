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
      build: { command: "vp build && node ./write-asset-headers.ts", cache: false },
      "mosaic-plan": { command: "node scripts/plan.ts", cache: false },
      "mosaic-superseded": { command: "node scripts/superseded.ts", cache: false },
      "mosaic-character": {
        command: ["cargo build --release --locked -p mosaic", "node scripts/character.ts"],
        cache: false,
      },
      "mosaic-finish": { command: "node scripts/finish.ts", cache: false },
      "deploy:mosaic-site": {
        command: ["node scripts/live.ts", "alchemy deploy --stage production --yes"],
        cache: false,
      },
      "deploy:mosaic-files": { command: "alchemy deploy alchemy.files.ts --yes", cache: false },
    },
  },
  base: `${BASE_PATH}/`,
  build: { copyPublicDir: false },
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.{ts,tsx}", "scripts/*.test.ts", "*.test.ts"] },
  plugins: mosaicPlugins(),
});
