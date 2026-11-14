import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cs:check"] },
      "cs:check": {
        command: "dotnet build --nologo",
        cache: false,
      },
    },
  },
});
