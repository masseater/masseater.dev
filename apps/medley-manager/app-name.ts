import { appNamed } from "@masseater.dev/alchemy-app-name";

const APP_NAME = "medley-manager";

const { requireAppPrefix } = appNamed(APP_NAME);

export { APP_NAME, requireAppPrefix };
