import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { d1Tasks } from "@masseater.dev/cloudflare-account/run-tasks";
import { defineConfig } from "vite-plus";

import { MCP_PATH, SITE_HOST } from "./src/shared/config/index.ts";

export default defineConfig({
  run: {
    tasks: {
      ...ownerSiteRun({ host: SITE_HOST, paths: [MCP_PATH] }).tasks,
      ...d1Tasks,
      verify: { command: [], dependsOn: ["db:check"] },
    },
  },
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.ts"] },
});
