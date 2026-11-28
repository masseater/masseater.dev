import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { OTEL_ENV, lapse } from "lapse";
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
      test: { command: "vp test run", cache: { ...LOCKED, untrackedEnv: OTEL_ENV } },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
  pack: [
    {
      entry: ["src/app/index.ts"],
      platform: "neutral",
      sourcemap: true,
      publint: { strict: true },
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
  plugins: [lapse()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
