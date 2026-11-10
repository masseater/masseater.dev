import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "prepare-data": { command: "node src/prepare.ts", cache: false },
      render: { command: "node src/render.ts", cache: false },
      measure: { command: "node src/measure.ts", cache: false },
      rescore: { command: "node src/rescore.ts", cache: false },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
