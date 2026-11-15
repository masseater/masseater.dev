import type { UserConfig } from "vite-plus";

import { alchemyTasks, deployTo } from "./run-tasks.ts";

const ownerSiteRun: NonNullable<UserConfig["run"]> = {
  tasks: { ...alchemyTasks, "deploy:production": deployTo("prod") },
};

export { ownerSiteRun };
