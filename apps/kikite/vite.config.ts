import { ownerSiteRun } from "@masseater.dev/cloudflare-account/owner-site-run";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { String as Str } from "effect";
import { defineConfig } from "vite-plus";

import { DEV_PROXY, interviewerDev } from "./src/app/server/dev.ts";

const AGENT_SDK = "@anthropic-ai/claude-agent-sdk";

export default defineConfig({
  msch: {
    lint: {
      overrides: [
        {
          files: ["src/shared/lib/screen-hold.ts"],
          rules: {
            "baseline-js/use-baseline": [
              "error",
              {
                available: "widely",
                includeWebApis: { preset: "auto" },
                includeJsBuiltins: { preset: "auto" },
                ignoreFeatures: ["screen-wake-lock"],
              },
            ],
          },
        },
        {
          files: ["src/app/server/serve.ts"],
          rules: { "effecttsgo/node-builtin-import": "off" },
        },
      ],
    },
  },
  run: ownerSiteRun,
  plugins: [tailwindcss(), viteReact(), interviewerDev()],
  server: { proxy: DEV_PROXY },
  build: { outDir: "dist/client" },
  pack: {
    entry: { server: "src/app/server/main.ts" },
    outDir: "dist/server",
    platform: "node",
    format: "esm",
    fixedExtension: true,
    dts: false,
    deps: {
      neverBundle: [AGENT_SDK],
      alwaysBundle: (id) => !Str.startsWith(AGENT_SDK)(id),
    },
    copy: [{ from: "src/app/server/Containerfile", to: "dist/server" }],
  },
  test: {
    include: ["**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
