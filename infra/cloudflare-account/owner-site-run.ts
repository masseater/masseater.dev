import type { UserConfig } from "vite-plus";

const ownerSiteRun: NonNullable<UserConfig["run"]> = {
  tasks: {
    deploy: { command: "alchemy deploy", cache: false },
    destroy: { command: "alchemy destroy", cache: false },
    "access-check": { command: "sh scripts/access-check.sh", cache: false },
  },
};

export { ownerSiteRun };
