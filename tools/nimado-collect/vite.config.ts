import { defineConfig } from "vite-plus";

const STATE = "--state ../../.nimado-state";

export default defineConfig({
  run: {
    tasks: {
      daily: {
        command: `node bin/nimado-collect.ts daily ${STATE} --out ../../apps/nimado/published`,
        cache: false,
      },
      release: {
        command: "node bin/nimado-collect.ts prune",
        dependsOn: ["nimado#deploy:data"],
        cache: false,
      },
      save: { command: `node bin/nimado-collect.ts save ${STATE}`, cache: false },
    },
  },
});
