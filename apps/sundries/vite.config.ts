import { alchemyTasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      ...alchemyTasks,
      retire: {
        command: "DOCKER_BIN=podman alchemy destroy alchemy.retired.ts --stage prod --yes",
        cache: false,
      },
      "deploy:production": { ...deployTo("prod"), dependsOn: ["retire"] },
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
