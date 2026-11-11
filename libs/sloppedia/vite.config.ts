import { checkPackage, createPackageFromTarballData } from "@r_masseater/vite-plus-adopt/attw";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { readme: true },
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
    attw: {
      module: { checkPackage, createPackageFromTarballData },
      profile: "esm-only",
      level: "error",
      excludeEntrypoints: ["./styles.css"],
    },
  },
  test: { environment: "happy-dom" },
});
