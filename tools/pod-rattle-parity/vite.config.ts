import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { lint: { ignorePatterns: ["engine.gen.js"] } },
  run: {
    tasks: {
      render: {
        command: "node bin/extract.ts && node bin/render.ts",
        cache: {
          input: [
            "bin/extract.ts",
            "bin/render.ts",
            "scenarios.json",
            { pattern: "apps/labs/pages/pod-rattle/index.html", base: "workspace" },
          ],
          output: ["engine.gen.js", "reference/**"],
        },
      },
    },
  },
});
