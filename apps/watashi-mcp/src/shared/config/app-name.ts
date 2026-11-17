import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "masseater-dev-watashi-mcp";

export const { prefix: PREFIX, requireAppPrefix } = appNamed(APP_NAME);
