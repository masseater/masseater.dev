import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { checkPackage, createPackageFromTarballData } from "@r_masseater/vite-plus-adopt/attw";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "48.1 MB" }, lint: { ignorePatterns: ["upstream/**"] } },
  run: {
    tasks: {
      test: {
        command: "vp test run",
        dependsOn: [{ task: "build", from: "devDependencies" }],
        cache: LOCKED,
      },
      verify: { command: [], dependsOn: ["size"] },
      build: { command: "vp pack", cache: LOCKED },
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
