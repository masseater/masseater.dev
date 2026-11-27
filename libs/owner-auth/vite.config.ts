import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    lint: {
      overrides: [
        {
          files: ["src/features/configure-auth/model/passkey.server.ts"],
          rules: { "import/no-unassigned-import": ["error", { allow: ["reflect-metadata"] }] },
        },
      ],
    },
  },
});
