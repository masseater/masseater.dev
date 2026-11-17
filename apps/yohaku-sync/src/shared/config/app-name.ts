import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "masseater-dev-yohaku-sync";

export const { prefix: PREFIX, requireAppPrefix } = appNamed(APP_NAME);
