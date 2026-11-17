import { appNamed } from "@masseater.dev/cloudflare-account/app-name";

export const APP_NAME = "masseater-dev-task-cache";

export const CACHE_HOST = "task-cache.masseater.dev";

export const { prefix: PREFIX, requireAppPrefix } = appNamed(APP_NAME);
