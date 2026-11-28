import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "masseater-dev-holons";

export const { requireAppPrefix } = appNamed(APP_NAME);
