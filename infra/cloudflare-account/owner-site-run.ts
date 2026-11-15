import type { UserConfig } from "vite-plus";

import { alchemyTasks, deployTo } from "./run-tasks.ts";

export const ownerSiteRun: NonNullable<UserConfig["run"]> = {
  tasks: { ...alchemyTasks, "deploy:production": deployTo("prod") },
};
