import { appNamed } from "@masseater.dev/alchemy-app-name";

const APP_NAME = "masseater-dev";

const { prefix: PREFIX, requireAppPrefix } = appNamed(APP_NAME);

const CI_TELEMETRY_AUDIENCE = `${PREFIX}ci-telemetry`;

const TRACE_DESTINATION = `${PREFIX}traces`;

export { APP_NAME, CI_TELEMETRY_AUDIENCE, PREFIX, TRACE_DESTINATION, requireAppPrefix };
