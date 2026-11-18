import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "72 MB" },
    lint: {
      overrides: [
        {
          files: ["src/features/authenticate-user/api/callback-server.ts"],
          rules: { "effecttsgo/node-builtin-import": "off" },
        },
      ],
    },
  },
  pack: {
    entry: { main: "src/app/main.ts" },
    platform: "node",
    deps: { alwaysBundle: [/./u], onlyBundle: false },
    publint: { strict: true },
  },
  test: {
    testTimeout: 60_000,
  },
  run: {
    tasks: {
      test: { command: "vp test run", dependsOn: [{ task: "native", from: "dependencies" }] },
      build: "vp pack",
    },
  },
});
