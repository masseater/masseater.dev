import type { UserConfig } from "vite-plus";

type Tasks = NonNullable<NonNullable<UserConfig["run"]>["tasks"]>;

const alchemyTasks = {
  dev: { command: "alchemy dev", cache: false },
  deploy: { command: "alchemy deploy", cache: false },
  destroy: { command: "alchemy destroy", cache: false },
} satisfies Tasks;

const d1Tasks = {
  "db:generate": "drizzle-kit generate",
  "db:check": [
    "drizzle-kit check",
    `drizzle-kit generate --explain --output json | grep -q '"status":"no_changes"'`,
  ],
} satisfies Tasks;

export { alchemyTasks, d1Tasks };
