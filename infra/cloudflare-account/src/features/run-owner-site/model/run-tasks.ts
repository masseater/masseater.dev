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

const UNAUTHENTICATED = 401;
const RETRIES = 5;
const RETRY_DELAY_SECONDS = 5;
const CONNECT_TIMEOUT_SECONDS = 10;
const ATTEMPT_TIMEOUT_SECONDS = 30;
const TOTAL_TIMEOUT_SECONDS = 180;

export const rejectsUnauthenticated = (mcpUrl: string): string =>
  `test "$(curl --silent --output /dev/null --write-out '%{http_code}' --retry ${RETRIES} --retry-delay ${RETRY_DELAY_SECONDS} --retry-all-errors --retry-max-time ${TOTAL_TIMEOUT_SECONDS} --connect-timeout ${CONNECT_TIMEOUT_SECONDS} --max-time ${ATTEMPT_TIMEOUT_SECONDS} --request POST --header 'content-type: application/json' --data '{}' ${mcpUrl})" = ${UNAUTHENTICATED}`;
