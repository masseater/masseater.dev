import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "0 B" },
    lint: {
      overrides: [
        {
          files: ["src/callback-server.ts"],
          rules: {
            "import/no-nodejs-modules": ["error", { allow: ["node:http"] }],
            "effecttsgo/node-builtin-import": "off",
          },
        },
      ],
    },
  },
  pack: {
    entry: { main: "src/main.ts" },
    platform: "node",
    deps: { alwaysBundle: [/./u], onlyBundle: false },
    publint: { strict: true },
  },
  test: {
    testTimeout: 60_000,
  },
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
    },
  },
});
