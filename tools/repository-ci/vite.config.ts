import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "prune-caches": { command: "node prune-caches.ts", cache: false },
      "deploy-failure": { command: "node deploy-failure.ts", cache: false },
      "zenn-publish": { command: "node zenn-publish.ts", cache: false },
    },
  },
});
