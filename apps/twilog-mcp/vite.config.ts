import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import { lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: ownerSiteRun,
  plugins: [lapse()],
  test: { include: ["src/**/*.test.ts"] },
});
