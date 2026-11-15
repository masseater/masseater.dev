import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cs:check"] },
      "cs:check": "dotnet build --nologo --disable-build-servers",
    },
  },
});
