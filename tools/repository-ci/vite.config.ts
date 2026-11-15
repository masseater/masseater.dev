import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "prune-caches": { command: "node bin/prune-caches.ts", cache: false },
      "deploy-failure": { command: "node bin/deploy-failure.ts", cache: false },
      "deploy-stacks": { command: "node bin/deploy-stacks.ts", cache: false },
      "release-components": { command: "node bin/release-components.ts", cache: false },
      "zenn-publish": { command: "node bin/zenn-publish.ts", cache: false },
    },
  },
});
