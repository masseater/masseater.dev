import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "205 MB" },
    lint: {
      overrides: [
        {
          files: ["src/entities/document/model/code.ts"],
          rules: { "import/no-namespace": ["error", { ignore: ["linguist-languages"] }] },
        },
      ],
    },
  },
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
