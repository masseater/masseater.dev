import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "67 MB" } },
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
    },
  },
  pack: {
    entry: ["src/index.ts"],
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
