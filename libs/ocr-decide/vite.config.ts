import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "67 MB" } },
  run: {
    tasks: {
      test: "vp test run",
      build: "vp pack",
    },
  },
  pack: {
    entry: ["src/app/index.ts"],
    platform: "neutral",
    sourcemap: true,
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
