import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cs:check"] },
      "cs:check": {
        command: "dotnet build --nologo --disable-build-servers",
        cache: {
          input: [{ auto: true }, "!node_modules", "!node_modules/**", "!**/bin/**", "!**/obj/**"],
        },
      },
    },
  },
});
