import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      jaeger: {
        command: "jaeger --config jaeger.yaml",
        cache: false,
      },
    },
  },
});
