import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { defineConfig, mergeConfig } from "vite-plus";

import { MCP_PATH, SITE_HOST } from "./src/shared/config/index.ts";

export default defineConfig(
  mergeConfig(
    {
      run: ownerSiteRun({ host: SITE_HOST, paths: [MCP_PATH] }),
      resolve: { tsconfigPaths: true },
      test: { include: ["src/**/*.test.ts"] },
    },
    {
      run: { tasks: { "deploy:production": { dependsOn: ["plamo-translate#deploy:production"] } } },
    },
  ),
);
