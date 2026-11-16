import { alchemyTasks, d1Tasks } from "@masseater.dev/cloudflare-account/run-tasks";
import { defineConfig } from "vite-plus";

import { portfolioPlugins } from "./src/app/vite/plugins.ts";

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
          files: ["src/app/worker/**/*.ts", "src/**/*.server.ts"],
          excludeFiles: ["**/*.test.ts"],
          use: ["traced"],
        },
      ],
    },
  },
  run: {
    tasks: {
      ...alchemyTasks,
      "alchemy-state-rm": { command: 'alchemy state rm --no-input "$STATE_PATH"', cache: false },
      "deploy:bootstrap": {
        command: "ALCHEMY_STAGE=prod alchemy deploy --yes",
        cache: false,
        dependsOn: ["labs#deploy:bootstrap"],
      },
      "deploy:production": {
        command: [
          "alchemy deploy --config alchemy.traces.ts --stage prod --yes",
          "WORKERS_TRACES_SINK=masseater-dev-trace-sink workers-traces --request https://masseater.dev/ --expect GET --wait 300",
        ],
        cache: false,
      },
      "deploy:zone": {
        command: "alchemy deploy --config alchemy.zone.ts --stage prod --yes",
        cache: false,
      },
      build: "vp build && sequoia inject",
      ...d1Tasks,
      "standard-site": { command: "vpx bin/standard-site.ts && sequoia publish", cache: false },
      "technique-examples": { command: "vpx bin/technique-examples.ts", cache: false },
    },
  },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
  plugins: portfolioPlugins(),
});
