import { Config, Effect } from "effect";

export const tableCache = Effect.fn("tableCache")(function* tableCache() {
  const home = yield* Config.String("HOME");
  const base = yield* Config.String("XDG_CACHE_HOME").pipe(Config.withDefault(`${home}/.cache`));
  return `${base}/i68-presets/chordonomicon`;
});
