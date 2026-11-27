import type { SceneOverride } from "@masseater.dev/video-kit";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

interface Context {
  readonly keys: () => readonly string[];
  readonly load: (key: string) => unknown;
}

interface WebpackRequire {
  readonly context: (
    directory: string,
    deep: boolean,
    pattern: RegExp,
  ) => Readonly<{ keys: () => string[] }> & ((key: string) => unknown);
}

declare const require: WebpackRequire;

type Found = ReturnType<WebpackRequire["context"]>;

const contextOf = (found: Found): Context => ({
  keys: () => found.keys(),
  load: (key) => found(key),
});

const scripts = contextOf(require.context("../pages", true, /^\.\/[a-z0-9-]+\/video\.md$/u));
const ejected = contextOf(
  require.context("../pages", true, /^\.\/[a-z0-9-]+\/scenes\/[a-z0-9-]+\.tsx$/u),
);

const SEPARATOR = "/";
const EMPTY = "";
const SLUG_AT = 1;

const slugOf = (key: string): string =>
  pipe(
    Str.split(SEPARATOR)(key),
    Arr.get(SLUG_AT),
    Option.getOrElse(() => key),
  );

const textOf = (loaded: unknown): string => {
  if (typeof loaded === "string") {
    return loaded;
  }
  return EMPTY;
};

/** @internal */
export interface VideoSource {
  readonly slug: string;
  readonly markdown: string;
}

/** @internal */
export const videoSources = (): readonly VideoSource[] =>
  pipe(
    scripts.keys(),
    Arr.map((key) => ({ slug: slugOf(key), markdown: textOf(scripts.load(key)) })),
  );

const isOverride = (value: unknown): value is SceneOverride => typeof value === "function";

const overrideOf = (loaded: unknown): Option.Option<SceneOverride> =>
  pipe(
    Option.liftPredicate(
      loaded,
      (module): module is Readonly<Record<string, unknown>> =>
        typeof module === "object" && module !== null,
    ),
    Option.flatMap((module) => Rec.get(module, "Scene")),
    Option.filter(isOverride),
  );

const SCENE_FILE = /^.*\/scenes\/|\.tsx$/gu;

/** @internal */
export const overridesOf = (slug: string): Readonly<Record<string, SceneOverride>> =>
  pipe(
    ejected.keys(),
    Arr.filter((key) => slugOf(key) === slug),
    Arr.flatMap((key) =>
      pipe(
        overrideOf(ejected.load(key)),
        Option.map((override) => [Str.replaceAll(SCENE_FILE, EMPTY)(key), override] as const),
        Option.toArray,
      ),
    ),
    Rec.fromEntries,
  );
