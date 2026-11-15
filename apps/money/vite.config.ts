import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { d1Tasks } from "@masseater.dev/cloudflare-account/run-tasks";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      ...ownerSiteRun.tasks,
      ...d1Tasks,
      verify: { command: [], dependsOn: ["db:check"] },
    },
  },
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.ts"] },
});
