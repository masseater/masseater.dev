import { appNamed } from "@masseater.dev/alchemy-app-name";

export const APP_NAME = "masseater-dev";

export const { prefix: PREFIX, requireAppPrefix } = appNamed(APP_NAME);

export const CI_TELEMETRY_AUDIENCE = `${PREFIX}ci-telemetry`;

export { TRACE_DESTINATION } from "@masseater.dev/cloudflare-account/trace-destination";
