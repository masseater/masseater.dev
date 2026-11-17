import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "thumb-mosaic";

export const { requireAppPrefix } = appNamed(APP_NAME);
