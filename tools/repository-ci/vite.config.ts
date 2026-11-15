import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "prune-caches": { command: "node bin/prune-caches.ts", cache: false },
      "deploy-failure": { command: "node bin/deploy-failure.ts", cache: false },
      "deploy-stacks": { command: "node bin/deploy-stacks.ts", cache: false },
      "record-deployment": { command: "node bin/record-deployment.ts", cache: false },
      "release-components": { command: "node bin/release-components.ts", cache: false },
      "task-packages": { command: "node bin/task-packages.ts", cache: false },
      "deploy:github": { command: "node bin/zenn-publish.ts", cache: false },
    },
  },
});
