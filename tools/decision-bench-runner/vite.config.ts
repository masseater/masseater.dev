import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "build:jnli": { command: "node bin/build-jnli.ts", cache: false },
      "build:rules": { command: "node bin/build-rules.ts", cache: false },
      bench: {
        command: "node bin/run.ts",
        cache: false,
      },
    },
  },
});
