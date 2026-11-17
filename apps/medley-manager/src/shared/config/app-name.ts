import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "medley-manager";

export const { requireAppPrefix } = appNamed(APP_NAME);
