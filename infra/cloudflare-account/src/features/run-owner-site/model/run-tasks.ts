import type { UserConfig } from "vite-plus";

type Tasks = NonNullable<NonNullable<UserConfig["run"]>["tasks"]>;

const PODMAN = "DOCKER_BIN=podman";

export const alchemyTasks = {
  dev: { command: `${PODMAN} alchemy dev`, cache: false },
  deploy: { command: `${PODMAN} alchemy deploy`, cache: false },
  destroy: { command: `${PODMAN} alchemy destroy`, cache: false },
} satisfies Tasks;

export const deployTo = (stage: "prod" | "production"): { command: string; cache: false } => ({
  command: `${PODMAN} alchemy deploy --stage ${stage} --yes`,
  cache: false,
});

export const d1Tasks = {
  "db:generate": "drizzle-kit generate",
  "db:check": [
    "drizzle-kit check",
    `drizzle-kit generate --explain --output json | grep -q '"status":"no_changes"'`,
  ],
} satisfies Tasks;
