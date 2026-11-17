import { LOCKED } from "@r_masseater/msch/locked-inputs";
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
      test: { command: "vp test run", cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
  pack: [
    {
      entry: ["src/app/index.ts"],
      platform: "neutral",
      sourcemap: true,
      dts: {
        generator: "tsgo",
      },
    },
    {
      entry: { main: "bin/injection-bisect.ts" },
      platform: "node",
      sourcemap: true,
    },
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
