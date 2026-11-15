import type { UserConfig } from "vite-plus";

const ownerSiteRun: NonNullable<UserConfig["run"]> = {
  tasks: {
    deploy: { command: "alchemy deploy", cache: false },
    destroy: { command: "alchemy destroy", cache: false },
  },
};

export { ownerSiteRun };
