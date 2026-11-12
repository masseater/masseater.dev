import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { String as Str } from "effect";
import { defineConfig } from "vite-plus";

import { DEV_PROXY, interviewerDev } from "./server/dev.ts";

const AGENT_SDK = "@anthropic-ai/claude-agent-sdk";

export default defineConfig({
  run: ownerSiteRun,
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), viteReact(), interviewerDev()],
  server: { proxy: DEV_PROXY },
  build: { outDir: "dist/client" },
  pack: {
    entry: { server: "server/main.ts" },
    outDir: "dist/server",
    platform: "node",
    format: "esm",
    fixedExtension: true,
    dts: false,
    deps: {
      neverBundle: [AGENT_SDK],
      alwaysBundle: (id) => !Str.startsWith(AGENT_SDK)(id),
    },
    copy: [{ from: "server/Dockerfile", to: "dist/server" }],
  },
  test: {
    include: ["**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
