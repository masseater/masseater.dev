import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["build"] },
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
  plugins: [otlp()],
});
