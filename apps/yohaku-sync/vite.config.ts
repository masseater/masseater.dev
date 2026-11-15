import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { SYNC_HOST } from "@masseater.dev/yohaku-protocol/sync";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: ownerSiteRun({ host: SYNC_HOST, paths: ["/", "/api/changes"] }),
  test: {
    include: ["**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
