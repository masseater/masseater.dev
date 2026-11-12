import { appNamed } from "@masseater.dev/alchemy-app-name";

const APP_NAME = "masseater-dev-yohaku-sync";

const { prefix: PREFIX, requireAppPrefix } = appNamed(APP_NAME);

export { APP_NAME, PREFIX, requireAppPrefix };
