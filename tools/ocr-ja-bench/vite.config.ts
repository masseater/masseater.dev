import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "prepare-data": { command: "node bin/prepare.ts", cache: false },
      render: { command: "node bin/render.ts", cache: false },
      measure: { command: "node bin/measure.ts", cache: false },
      rescore: { command: "node bin/rescore.ts", cache: false },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
