import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      dotnet: { cache: false, command: "scripts/check.sh" },
      fix: { cache: false, command: "scripts/check.sh --fix" },
      build: { cache: false, command: "scripts/build.sh" },
      publish: { cache: false, command: "scripts/build.sh --publish" },
      pck: { cache: false, command: "scripts/export-pck.sh" },
      stage: { cache: false, command: "scripts/stage.sh" },
      "new-mod": { cache: false, command: "scripts/new-mod.sh" },
    },
  },
});
