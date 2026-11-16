import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      grammar: "langium generate",
      "grammar:check": "langium generate && git diff --exit-code -- generated",
      verify: { command: [], dependsOn: ["grammar:check"] },
    },
  },
});
