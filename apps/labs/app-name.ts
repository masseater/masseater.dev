import { appNamed } from "@masseater.dev/alchemy-app-name";

const APP_NAME = "masseater-dev-labs";

const { requireAppPrefix } = appNamed(APP_NAME);

export { APP_NAME, requireAppPrefix };
