import { checkPackage, createPackageFromTarballData } from "@r_masseater/vite-plus-adopt/attw";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "0 B" } },
  run: {
    tasks: {
      test: "vp test run",
      verify: { command: [], dependsOn: ["size"] },
      build: "vp pack",
      size: { command: "size-limit", dependsOn: ["build"] },
    },
  },
  pack: {
    entry: ["src/app/index.ts", "src/app/schema.ts"],
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
