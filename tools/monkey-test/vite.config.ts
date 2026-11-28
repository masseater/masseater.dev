import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      daily: {
        command: [
          "vp exec playwright install --with-deps --only-shell chromium",
          "node bin/monkey-test.ts",
        ],
        cache: false,
      },
    },
  },
});
