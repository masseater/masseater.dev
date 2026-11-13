import { defineConfig } from "vite-plus";

export default defineConfig({
  test: { server: { deps: { inline: ["@effect/vitest"] } } },
  pack: {
    entry: { main: "src/app/main.ts" },
    outDir: "dist",
    platform: "node",
    format: "esm",
    deps: {
      alwaysBundle: [/./u],
      onlyBundle: false,
    },
  },
  run: {
    tasks: {
      serve: {
        command: "node src/app/main.ts",
        cache: false,
      },
    },
  },
});
