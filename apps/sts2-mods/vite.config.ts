import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["dotnet"] },
      dotnet: "dotnet build --disable-build-servers -p:CopyToModsFolder=false",
      fix: { cache: false, command: "dotnet format --exclude build" },
      build: { cache: false, command: "dotnet build" },
      publish: { cache: false, command: "dotnet publish" },
      pck: { cache: false, command: "dotnet msbuild -restore -t:ExportPck" },
      "pck:all": { cache: false, command: "node bin/export-all-pck.ts" },
      "release:linux": {
        cache: false,
        command: "PCK_OUT=release-assets node bin/export-all-pck.ts",
      },
      "new-mod": {
        cache: false,
        command:
          "dotnet new install templates/mod --force && dotnet new sts2-mod --output . --name",
      },
    },
  },
});
