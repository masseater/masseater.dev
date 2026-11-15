import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "173 MB" } },
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
  plugins: [otlp()],
  pack: {
    entry: ["src/main.ts"],
    platform: "node",
    sourcemap: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
