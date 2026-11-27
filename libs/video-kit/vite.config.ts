import { browserTest } from "@masseater.dev/browser-test/vite";
import { LOCKED } from "@r_masseater/msch/locked-inputs";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  ...browserTest({ width: 1320, height: 900 }),
  plugins: [tailwindcss()],
  msch: {
    lint: {
      overrides: [
        {
          files: ["src/shared/ui/box.tsx", "src/shared/ui/run.tsx"],
          rules: {
            "shadcn/no-inline-styles": ["error", { allowDynamicIdentifiers: ["vars"] }],
          },
        },
        {
          files: ["src/app/sheet.test.support.tsx"],
          rules: {
            "shadcn/no-inline-styles": ["error", { allowDynamicIdentifiers: ["fit"] }],
          },
        },
      ],
    },
  },
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
    },
  },
});
