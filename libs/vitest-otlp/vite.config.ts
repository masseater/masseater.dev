import { defineConfig } from "vite-plus";

import { otlp } from "./src/app/index.ts";

export default defineConfig({
  msch: {
    publish: { installSize: "16.5 MB" },
    devDependencies: {
      "OTLP の受け口は OpenTelemetry の SDK から送ってテストする": { use: ["instrumentation"] },
      "Workers のスパンは Miniflare で Worker を動かしてテストする": {
        dependencies: ["miniflare"],
      },
    },
    lint: {
      overrides: [
        { files: ["src/**/*.test.ts"], use: ["otlpInterop"] },
        {
          files: ["src/app/setup.ts"],
          rules: {
            "node/no-process-env": "off",
            "baseline-js/use-baseline": ["error", { ignoreFeatures: ["top-level-await"] }],
          },
        },
      ],
    },
  },
  run: {
    tasks: {
      test: "vp test run",
      build: "vp pack",
      generate: { command: "buf generate", cache: false },
    },
  },
  plugins: [otlp()],
  pack: [
    {
      entry: ["src/app/index.ts", "src/app/setup.ts", "src/app/semconv.ts", "src/app/workers.ts"],
      platform: "node",
      sourcemap: true,
      dts: true,
    },
    { entry: ["src/app/tail.worker.ts"], platform: "neutral", sourcemap: true, dts: false },
  ],
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
