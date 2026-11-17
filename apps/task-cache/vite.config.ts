import { alchemyTasks, d1Tasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: { ...alchemyTasks, ...d1Tasks, "deploy:production": deployTo("prod") },
  },
  test: {
    include: ["**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
