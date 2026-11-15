import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "67 MB" } },
  run: {
    tasks: {
      test: "vp test run",
      "npm:publish": {
        command: "node ../../tools/npm-publish/src/main.ts",
        dependsOn: ["test", "build"],
        cache: false,
      },
      build: "vp pack",
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
