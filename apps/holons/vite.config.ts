import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { lint: { ignorePatterns: ["public/index.html"] } },
  run: ownerSiteRun,
});
