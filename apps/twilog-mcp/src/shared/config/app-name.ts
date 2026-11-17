import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "masseater-dev-twilog";

export const { prefix: PREFIX, requireAppPrefix } = appNamed(APP_NAME);
