import { checkPackage, createPackageFromTarballData } from "@r_masseater/vite-plus-adopt/attw";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "48.1 MB" }, lint: { ignorePatterns: ["upstream/**"] } },
  run: {
    tasks: {
      test: "vp test run",
      verify: { command: [], dependsOn: ["size"] },
      build: "vp pack",
      size: { command: "size-limit", dependsOn: ["build"] },
    },
  },
  pack: {
    entry: { index: "src/app/index.ts" },
    platform: "node",
    sourcemap: true,
    dts: true,
    publint: { strict: true },
    attw: {
      module: { checkPackage, createPackageFromTarballData },
      profile: "esm-only",
      level: "error",
    },
  },
});
