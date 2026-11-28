import { alchemyTasks, d1Tasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import { lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: { ...alchemyTasks, ...d1Tasks, "deploy:production": deployTo("prod") },
  },
  plugins: [lapse()],
  test: {
    include: ["**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
