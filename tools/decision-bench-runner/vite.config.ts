import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "build:jnli": { command: "node src/build-jnli.ts", cache: false },
      "build:rules": { command: "node src/build-rules.ts", cache: false },
      bench: {
        command: "node src/run.ts",
        cache: false,
      },
    },
  },
});
