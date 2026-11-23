import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "masseater-dev";

export const { prefix: PREFIX, requireAppPrefix } = appNamed(APP_NAME);

export { TRACE_DESTINATION } from "@masseater.dev/cloudflare-account/trace-destination";
