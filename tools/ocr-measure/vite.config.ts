import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      render: { command: "node bin/render.ts", cache: false },
      measure: { command: "node bin/measure.ts", cache: false },
      rescore: { command: "node bin/rescore.ts", cache: false },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
