import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    dependencies: {
      "Vitest takes the spans of test files, imports and tests only from an OpenTelemetry SDK that it starts itself":
        {
          use: ["instrumentation"],
        },
    },
  },
});
