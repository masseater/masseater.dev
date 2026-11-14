import { defineConfig } from "vite-plus";

import { otlp } from "./src/index.ts";

export default defineConfig({
  msch: {
    publish: { installSize: "16.5 MB" },
    lint: {
      overrides: [
        { files: ["src/**/*.test.ts"], use: ["otlpInterop"] },
        {
          files: ["src/grpc.ts", "src/forward.ts", "src/workers.ts"],
          rules: { "import/no-nodejs-modules": ["error", { allow: ["node:http2", "node:url"] }] },
        },
        {
          files: ["src/setup.ts"],
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
      build: { command: "vp pack", cache: false },
      generate: { command: "buf generate", cache: false },
    },
  },
  plugins: [otlp()],
  pack: [
    {
      entry: ["src/index.ts", "src/setup.ts", "src/semconv.ts", "src/workers.ts"],
      platform: "node",
      sourcemap: true,
      dts: true,
    },
    { entry: ["src/tail.worker.ts"], platform: "neutral", sourcemap: true, dts: false },
  ],
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/semconv-fixture/**"],
    testTimeout: 60_000,
  },
});
