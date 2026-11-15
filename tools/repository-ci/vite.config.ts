import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "prune-caches": { command: "node scripts/prune-caches.ts", cache: false },
      "deploy-failure": { command: "node scripts/deploy-failure.ts", cache: false },
      "deploy-stacks": { command: "node scripts/deploy-stacks.ts", cache: false },
      "release-components": { command: "node scripts/release-components.ts", cache: false },
      "task-packages": { command: "node scripts/task-packages.ts", cache: false },
      "zenn-publish": { command: "node scripts/zenn-publish.ts", cache: false },
    },
  },
});
