import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      bench: { command: "mise install && mise exec -- node bin/lint-bench.ts", cache: false },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
