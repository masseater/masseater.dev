import {
  envPrefixOf,
  requireAppPrefix as requireAppPrefixOf,
} from "@masseater.dev/start-site/alchemy";

const APP_NAME = "mst-ja-decision-bench";

const ENV_PREFIX = envPrefixOf(APP_NAME);

const requireAppPrefix = requireAppPrefixOf(APP_NAME);

export { APP_NAME, ENV_PREFIX, requireAppPrefix };
