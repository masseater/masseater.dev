import { Config, Duration } from "effect";

const IDLE_MINUTES = 30;

export const IDLE_LIMIT: Duration.Duration = Duration.minutes(IDLE_MINUTES);
export const SERVER_FLAG = "data";

const userHome = Config.String("HOME").pipe(Config.orElse(() => Config.String("USERPROFILE")));

const cacheDirectory = Config.String("XDG_CACHE_HOME").pipe(
  Config.orElse(() => userHome.pipe(Config.map((directory) => `${directory}/.cache`))),
);

export const dataDirectory: Config.Config<string> = Config.String("CLAUDE_PLUGIN_DATA").pipe(
  Config.orElse(() => cacheDirectory.pipe(Config.map((directory) => `${directory}/kogane`))),
);
