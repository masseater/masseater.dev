import { String as Str } from "effect";
import { defineConfig } from "vite-plus";

const NATIVE = "@snazzah/davey";

export default defineConfig({
  run: {
    tasks: {
      deploy: { command: "alchemy deploy", cache: false },
      destroy: { command: "alchemy destroy", cache: false },
    },
  },
  pack: {
    entry: { player: "player/main.ts" },
    outDir: "dist/player",
    platform: "node",
    format: "esm",
    fixedExtension: true,
    dts: false,
    deps: {
      neverBundle: [NATIVE],
      alwaysBundle: (id) => !Str.startsWith(NATIVE)(id),
    },
    copy: [{ from: "player/Dockerfile", to: "dist/player" }],
  },
  test: { include: ["**/*.test.ts"] },
});
