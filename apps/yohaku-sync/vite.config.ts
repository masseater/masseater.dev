import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: ownerSiteRun,
  test: {
    include: ["**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
