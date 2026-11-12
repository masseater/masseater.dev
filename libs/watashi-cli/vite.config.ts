import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: true },
  pack: {
    entry: { main: "src/main.ts" },
    platform: "node",
    deps: { alwaysBundle: [/./u], onlyBundle: false },
    publint: { strict: true },
  },
  test: {
    testTimeout: 60_000,
  },
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
    },
  },
});
