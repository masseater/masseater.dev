import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "masseater-dev-labs";

export const { requireAppPrefix } = appNamed(APP_NAME);
