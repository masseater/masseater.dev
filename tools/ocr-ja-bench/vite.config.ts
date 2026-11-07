import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "prepare-data": {
        command:
          "uv run --project prepare python -I prepare/prepare.py .cache/images data/jawildtext.json",
        cache: false,
      },
      render: { command: "node src/render.ts", cache: false },
      measure: { command: "node src/measure.ts", cache: false },
      rescore: { command: "node src/rescore.ts", cache: false },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
