import { requireAppPrefix as requireAppPrefixOf } from "@masseater.dev/start-site/alchemy";

const APP_NAME = "mst-ja-decision-bench";

const requireAppPrefix = requireAppPrefixOf(APP_NAME);

export { APP_NAME, requireAppPrefix };
