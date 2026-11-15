import { defineConfig } from "vite-plus";

export default defineConfig({
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
      build: "vp pack",
      "fetch-model": "node src/app/fetch-model.ts",
      "installer:resources": {
        command: "node src/app/installer-resources.ts",
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
