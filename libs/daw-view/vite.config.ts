import { browserTest } from "@masseater.dev/browser-test/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  ...browserTest({ width: 1180, height: 1400 }),
  plugins: [tailwindcss()],
});
