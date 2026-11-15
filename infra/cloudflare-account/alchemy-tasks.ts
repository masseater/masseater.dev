import type { UserConfig } from "vite-plus";

type Tasks = NonNullable<NonNullable<UserConfig["run"]>["tasks"]>;

const alchemyTasks = {
  dev: { command: "alchemy dev", cache: false },
  deploy: { command: "alchemy deploy", cache: false },
  destroy: { command: "alchemy destroy", cache: false },
} satisfies Tasks;

export { alchemyTasks };
