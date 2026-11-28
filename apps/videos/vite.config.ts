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
          rules: {
            "no-magic-numbers": "off",
            "max-lines": "off",
            "max-lines-per-function": "off",
            "react/only-export-components": "off",
            "react/jsx-no-literals": "off",
            "react/no-multi-comp": "off",
            "react/jsx-max-depth": "off",
            "react-perf/jsx-no-new-array-as-prop": "off",
            "react-perf/jsx-no-new-object-as-prop": "off",
            "shadcn/no-arbitrary-values": "off",
            "shadcn/no-inline-styles": "off",
          },
        },
      ],
    },
  },
});
