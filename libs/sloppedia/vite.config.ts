import { defineConfig } from "vite-plus";

export default defineConfig({
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
