import { Array as Arr } from "effect";
import type { UserConfig } from "vite-plus";

import { alchemyTasks } from "./run-tasks.ts";

export const ownerSiteRun = ({
  host,
  paths,
}: Readonly<{ host: string; paths: readonly string[] }>): NonNullable<UserConfig["run"]> => ({
  tasks: {
    ...alchemyTasks,
    "access-check": {
      command: Arr.join(["access-check", `https://${host}`, ...paths], " "),
      cache: false,
    },
  },
});
