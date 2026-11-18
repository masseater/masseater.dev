import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    dependencies: {
      "Browsers are auto-instrumented only by the official OpenTelemetry Browser SDK": {
        use: ["instrumentation"],
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
