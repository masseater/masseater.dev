export const PREFIX = "masseater-dev-";

export const CREDENTIAL_BROKER_AUDIENCE = `${PREFIX}credential-broker`;

export const GITHUB_APP_NAME = "masseater-manager";

export const TRACE_DESTINATION = `${PREFIX}traces`;

export const IDLE_CHECK_MINUTES = 30;

export const IDLE_CHECK_CRON = `*/${IDLE_CHECK_MINUTES} * * * *`;

export const HOURLY_CRON = "41 * * * *";
