import { appNamed } from "@masseater.dev/alchemy-app-name";

const APP_NAME = "masseater-dev-labs";

const { requireAppPrefix } = appNamed(APP_NAME);

export { APP_NAME, requireAppPrefix };
export { TRACE_DESTINATION } from "@masseater.dev/cloudflare-account/trace-destination";
