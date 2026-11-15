import { defineConfig } from "vite-plus";

const STATE = "--state ../../.nimado-state";

export default defineConfig({
  run: {
    tasks: {
      daily: {
        command: `node src/main.ts daily ${STATE} --out ../../apps/nimado/published`,
        cache: false,
      },
      release: {
        command: "node src/main.ts prune",
        dependsOn: ["nimado#deploy:data"],
        cache: false,
      },
      save: { command: `node src/main.ts save ${STATE}`, cache: false },
    },
  },
});
