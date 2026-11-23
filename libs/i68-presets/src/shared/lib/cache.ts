import { Config, Effect, Path } from "effect";

export const tableCache = Effect.gen(function* tableCache() {
  const path = yield* Path.Path;
  const home = yield* Config.String("HOME");
  const base = yield* Config.String("XDG_CACHE_HOME").pipe(
    Config.withDefault(path.join(home, ".cache")),
  );
  return path.join(base, "i68-presets", "chordonomicon");
});
