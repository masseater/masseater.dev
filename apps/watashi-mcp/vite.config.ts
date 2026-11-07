import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      dev: { command: "alchemy dev", cache: false },
      deploy: { command: "alchemy deploy", cache: false },
      destroy: { command: "alchemy destroy", cache: false },
      "db:generate": { command: "drizzle-kit generate", cache: false },
      "auth:generate": {
        command:
          "auth generate --config auth.config.ts --output src/shared/auth/generated/auth.table.ts --yes",
        cache: false,
      },
      "db:check": [
        "drizzle-kit check",
        `drizzle-kit generate --explain --output json | grep -q '"status":"no_changes"'`,
      ],
    },
  },
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/app",
      router: { routeTreeFileHeader: [] },
      rsc: { enabled: true },
    }),
    rsc(),
    viteReact(),
  ],
});
