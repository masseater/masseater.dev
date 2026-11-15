import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { defineConfig } from "vite-plus";

import { MCP_PATH, SITE_HOST } from "./src/shared/config/index.ts";

const ownerRun = ownerSiteRun({ host: SITE_HOST, paths: [MCP_PATH] });

export default defineConfig({
  run: {
    ...ownerRun,
    tasks: {
      ...ownerRun.tasks,
      verify: { command: [], dependsOn: ["db:check"] },
      "db:generate": { command: "drizzle-kit generate", cache: false },
      "db:check": [
        "drizzle-kit check",
        `drizzle-kit generate --explain --output json | grep -q '"status":"no_changes"'`,
      ],
    },
  },
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.ts"] },
});
