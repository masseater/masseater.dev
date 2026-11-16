import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [otlp({ semconv: true })],
  test: { include: ["*.fixture.ts"] },
});
