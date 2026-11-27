import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    lint: {
      overrides: [
        {
          files: ["src/app/index.ts"],
          rules: { "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }] },
        },
        {
          files: ["src/pages/*/video.tsx"],
          rules: { "no-magic-numbers": "off", "react/only-export-components": "off" },
        },
      ],
    },
  },
});
