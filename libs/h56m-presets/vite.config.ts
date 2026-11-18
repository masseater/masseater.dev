import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["test", "build"] },
      native: {
        command: "node bin/extract.ts",
        cache: {
          input: [
            "package.json",
            "bin/extract.ts",
            { pattern: "pnpm-lock.yaml", base: "workspace" },
          ],
          output: ["presets/**", "THIRD-PARTY-NOTICES.txt"],
        },
      },
      build: { command: "vp pack", dependsOn: ["native"], cache: LOCKED },
      test: {
        command: "vp test run",
        dependsOn: ["native", "@r_masseater/h56m#native"],
        cache: LOCKED,
      },
    },
  },
  pack: {
    entry: { index: "src/app/index.ts" },
    platform: "node",
    sourcemap: true,
    dts: { generator: "tsgo" },
    publint: { strict: true },
  },
  plugins: [otlp()],
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
