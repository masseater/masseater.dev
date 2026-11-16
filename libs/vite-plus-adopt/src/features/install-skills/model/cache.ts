import { Config, Context, Effect, Option, Path, pipe } from "effect";

import { configMissing } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

export const SkillCacheDirectory = Context.Reference<Option.Option<string>>(
  "vite-plus-adopt/SkillCacheDirectory",
  { defaultValue: Option.none },
);

const SUBDIRECTORY = ["vpa", "skills"];

const variable = (name: string): Effect.Effect<Option.Option<string>> =>
  Config.option(Config.NonEmptyString(name)).pipe(Effect.orElseSucceed(Option.none));

const platformCache: Effect.Effect<Option.Option<string>, never, Path.Path> = Effect.gen(
  function* platformCache() {
    const path = yield* Path.Path;
    if (process.platform === "win32") {
      return yield* variable("LOCALAPPDATA");
    }
    const home = yield* variable("HOME");
    return pipe(
      home,
      Option.map((directory) => path.join(directory, ".cache")),
    );
  },
);

const baseDirectory: Effect.Effect<string, VpToolsError, Path.Path> = variable(
  "XDG_CACHE_HOME",
).pipe(
  Effect.flatMap(
    Option.match({
      onNone: () => platformCache,
      onSome: Effect.succeedSome,
    }),
  ),
  Effect.flatMap(Effect.fromOption),
  Effect.mapError(() => configMissing("No cache directory: set XDG_CACHE_HOME or HOME")),
);

/** @internal */
export const skillCacheDirectory: Effect.Effect<string, VpToolsError, Path.Path> = Effect.gen(
  function* skillCache() {
    const path = yield* Path.Path;
    const configured = yield* SkillCacheDirectory;
    if (Option.isSome(configured)) {
      return configured.value;
    }
    const base = yield* baseDirectory;
    return path.join(base, ...SUBDIRECTORY);
  },
);
