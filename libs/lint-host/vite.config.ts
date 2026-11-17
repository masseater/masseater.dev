import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["test", "build"] },
      test: { command: "vp test run" },
      build: { command: "vp pack" },
    },
  },
  pack: {
    entry: { index: "src/app/index.ts", vite: "src/app/vite.ts" },
    platform: "node",
    sourcemap: true,
    dts: { generator: "tsgo" },
    publint: { strict: true },
  },
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
  },
  plugins: [otlp()],
});
