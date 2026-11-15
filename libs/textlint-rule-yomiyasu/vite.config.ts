import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { lint: { ignorePatterns: ["upstream/**"] } },
});
