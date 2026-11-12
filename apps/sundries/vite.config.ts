import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: ownerSiteRun,
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.ts"] },
});
