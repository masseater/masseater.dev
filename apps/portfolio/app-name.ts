import { appNamed } from "@masseater.dev/alchemy-app-name";

const APP_NAME = "masseater-dev";

const { prefix: PREFIX, requireAppPrefix } = appNamed(APP_NAME);

const CI_TELEMETRY_AUDIENCE = `${PREFIX}ci-telemetry`;

const CREDENTIAL_BROKER_AUDIENCE = `${PREFIX}credential-broker`;

const GITHUB_APP_NAME = `${PREFIX}iac`;

export {
  APP_NAME,
  CI_TELEMETRY_AUDIENCE,
  CREDENTIAL_BROKER_AUDIENCE,
  GITHUB_APP_NAME,
  PREFIX,
  requireAppPrefix,
};
