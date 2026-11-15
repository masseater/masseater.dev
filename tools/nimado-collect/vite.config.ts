import { defineConfig } from "vite-plus";

const STATE = "--state .persist";

export default defineConfig({
  run: {
    tasks: {
      daily: { command: "vp run collect && vp run release", cache: false },
      collect: {
        command: `node src/main.ts daily ${STATE} --out ../../apps/nimado/published`,
        cache: false,
      },
      release: {
        command: "node src/main.ts prune",
        dependsOn: ["nimado#deploy:data"],
        cache: false,
      },
      "daily:finally": { command: `node src/main.ts save ${STATE}`, cache: false },
      "persist-migrate": { command: "node src/persist-migrate.ts", cache: false },
    },
  },
});
