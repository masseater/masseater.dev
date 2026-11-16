import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: ownerSiteRun,
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), viteReact()],
  build: { outDir: "dist/client" },
  test: {
    include: ["**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
