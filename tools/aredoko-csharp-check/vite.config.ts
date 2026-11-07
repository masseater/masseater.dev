import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "cs:check": {
        command: "dotnet build --nologo",
        cache: false,
      },
    },
  },
});
