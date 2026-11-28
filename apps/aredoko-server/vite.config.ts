import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [lapse()],
  test: { server: { deps: { inline: ["@effect/vitest"] } } },
  pack: {
    entry: { main: "src/app/main.ts", "embedder-worker": "src/app/embedder-worker.ts" },
    outDir: "dist",
    platform: "node",
    format: "esm",
    deps: {
      alwaysBundle: [/./u],
      onlyBundle: false,
      neverBundle: ["@huggingface/transformers", "sqlite-vec"],
    },
  },
  run: {
    tasks: {
      build: { command: "vp pack", cache: LOCKED },
      "fetch-model": "node bin/fetch-model.ts",
      "installer:resources": {
        command: "node bin/installer-resources.ts",
        dependsOn: ["build"],
        cache: false,
      },
      serve: {
        command: "node src/app/main.ts",
        cache: false,
      },
    },
  },
});
