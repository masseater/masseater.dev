import type { UserConfig } from "vite-plus";

import { alchemyTasks, deployTo } from "./run-tasks.ts";

const ownerSiteRun: NonNullable<UserConfig["run"]> = {
  tasks: {
    ...alchemyTasks,
    "access-check": { command: "sh scripts/access-check.sh", cache: false },
    "deploy:production": deployTo("prod"),
  },
};

export { ownerSiteRun };
