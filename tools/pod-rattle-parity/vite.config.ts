import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      render: {
        command: "node extract.ts && node render.ts",
        cache: {
          input: [
            "extract.ts",
            "render.ts",
            "scenarios.json",
            { pattern: "apps/labs/pages/pod-rattle/index.html", base: "workspace" },
          ],
          output: ["engine.gen.js", "reference/**"],
        },
      },
    },
  },
});
