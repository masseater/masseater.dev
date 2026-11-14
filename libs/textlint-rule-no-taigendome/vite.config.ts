import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    lint: {
      overrides: [{ files: ["src/index.ts"], rules: { "import/no-default-export": "off" } }],
    },
  },
});
