import { defineConfig } from "vite-plus";

const STATE = "--state .persist";

export default defineConfig({
  run: {
    tasks: {
      daily: { command: "vp run collect && vp run release", cache: false },
      collect: {
        command: `node bin/nimado-collect.ts daily ${STATE} --out ../../apps/nimado/published`,
        cache: false,
      },
      release: {
        command: "node bin/nimado-collect.ts prune",
        dependsOn: ["nimado#deploy:data"],
        cache: false,
      },
      "daily:finally": { command: `node bin/nimado-collect.ts save ${STATE}`, cache: false },
      "persist-migrate": { command: "node bin/persist-migrate.ts", cache: false },
    },
  },
});
