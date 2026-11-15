import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { defineConfig } from "vite-plus";

import { MCP_PATH, SITE_HOST } from "./src/shared/config/index.ts";

export default defineConfig({
  run: ownerSiteRun({ host: SITE_HOST, paths: [MCP_PATH] }),
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.ts"] },
});
