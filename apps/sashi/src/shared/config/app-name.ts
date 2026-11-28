import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "masseater-dev-sashi";

export const { requireAppPrefix } = appNamed(APP_NAME);
