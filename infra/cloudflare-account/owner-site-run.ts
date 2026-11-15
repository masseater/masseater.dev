import type { UserConfig } from "vite-plus";

import { alchemyTasks } from "./run-tasks.ts";

export const ownerSiteRun: NonNullable<UserConfig["run"]> = {
  tasks: alchemyTasks,
};
