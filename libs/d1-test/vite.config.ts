import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    devDependencies: {
      "テストの D1 と R2 は Miniflare が動かす本物を使う": {
        dependencies: ["miniflare"],
      },
    },
  },
});
