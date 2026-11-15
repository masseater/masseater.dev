import type { UserConfig } from "vite-plus";

import { alchemyTasks } from "./alchemy-tasks.ts";

const ownerSiteRun: NonNullable<UserConfig["run"]> = {
  tasks: {
    ...alchemyTasks,
    "access-check": { command: "sh scripts/access-check.sh", cache: false },
  },
};

export { ownerSiteRun };
