import { alchemyTasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import { defineConfig } from "vite-plus";

import { HOST } from "./src/shared/config/index.ts";

const PAGE = `https://${HOST}/`;

const zoom = `node bin/measure-zoom.ts ${PAGE}`;

const webVitals = `web-vitals-flow ${PAGE} --report-dir report/web-vitals || echo "holons misses the Web Vitals passing score; see report/web-vitals" >&2`;

export default defineConfig({
  msch: { lint: { ignorePatterns: ["public/index.html"] } },
  run: {
    tasks: {
      ...alchemyTasks,
      "deploy:production": { command: [deployTo("prod").command, zoom, webVitals], cache: false },
    },
  },
});
