import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { defineConfig } from "vite-plus";

import { HOST } from "./config.ts";

export default defineConfig({
  run: ownerSiteRun({ host: HOST, paths: ["/", "/translate"] }),
  test: {
    include: ["**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
