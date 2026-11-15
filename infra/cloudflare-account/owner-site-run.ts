import type { UserConfig } from "vite-plus";

import { alchemyTasks } from "./run-tasks.ts";

const ownerSiteRun: NonNullable<UserConfig["run"]> = {
  tasks: alchemyTasks,
};

export { ownerSiteRun };
