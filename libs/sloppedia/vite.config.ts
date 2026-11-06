import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
      size: { command: "size-limit", dependsOn: ["build"], cache: false },
    },
  },
  pack: {
    entry: ["src/index.ts", "src/schema.ts"],
    platform: "neutral",
    sourcemap: true,
    dts: true,
    publint: { strict: true },
    attw: { profile: "esm-only", level: "error", excludeEntrypoints: ["./styles.css"] },
  },
  test: { environment: "happy-dom" },
});
