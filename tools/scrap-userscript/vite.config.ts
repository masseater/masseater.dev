import monkey from "vite-plugin-monkey";
import { defineConfig } from "vite-plus";

import { version } from "./package.json";

export default defineConfig({
  build: { outDir: "release", emptyOutDir: true },
  test: { include: ["src/**/*.test.ts"] },
  plugins: [
    monkey({
      entry: "src/main.ts",
      build: { fileName: "scrap-request.user.js" },
      userscript: {
        name: "Scrap request to Claude",
        namespace: "https://masseater.dev",
        version,
        description:
          "閲覧中のページを masseater.dev の scrap にするよう、Claude Code のルーチンへ頼む",
        homepageURL: "https://github.com/masseater/masseater.dev/tree/main/tools/scrap-userscript",
        match: ["*://*/*"],
        noframes: true,
        connect: ["api.anthropic.com"],
      },
    }),
  ],
});
