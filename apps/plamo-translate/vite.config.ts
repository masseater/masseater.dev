import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      deploy: { command: "alchemy deploy", cache: false },
      destroy: { command: "alchemy destroy", cache: false },
      "access-check": { command: "sh scripts/access-check.sh", cache: false },
    },
  },
  test: {
    include: ["**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
