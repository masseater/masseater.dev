import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { defineConfig, mergeConfig } from "vite-plus";

export default defineConfig(
  mergeConfig(
    {
      run: ownerSiteRun,
      test: { include: ["src/**/*.test.ts"] },
    },
    {
      run: { tasks: { "deploy:production": { dependsOn: ["plamo-translate#deploy:production"] } } },
    },
  ),
);
