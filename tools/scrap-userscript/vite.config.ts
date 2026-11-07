import monkey from "vite-plugin-monkey";
import { defineConfig } from "vite-plus";

import { version } from "./package.json";

export default defineConfig({
  run: {
    tasks: {
      "release-check": {
        command: [
          "vp build",
          "git diff --quiet -- release",
          'test -z "$(git ls-files --others --exclude-standard -- release)"',
        ],
        cache: false,
      },
    },
  },
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
          "閲覧中のページについて masseater.dev の Sloppedia に記事を書くよう、Claude Code のルーチンへ頼む。watashi.masseater.dev にログインできる持ち主専用",
        homepageURL: "https://github.com/masseater/masseater.dev/tree/main/tools/scrap-userscript",
        match: ["*://*/*"],
        noframes: true,
        connect: ["watashi.masseater.dev"],
      },
    }),
  ],
});
