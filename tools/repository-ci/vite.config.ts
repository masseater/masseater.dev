import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "prune-caches": { command: "node scripts/prune-caches.ts", cache: false },
      "deploy-failure": { command: "node scripts/deploy-failure.ts", cache: false },
      "deploy-stacks": { command: "node scripts/deploy-stacks.ts", cache: false },
      "record-deploy": { command: "node scripts/record-deploy.ts", cache: false },
      "zenn-publish": { command: "node scripts/zenn-publish.ts", cache: false },
    },
  },
});
