import type { Draw, Look } from "@masseater.dev/video-kit";
import type { VideoScript } from "@masseater.dev/video-kit/script";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

interface WebpackRequire {
  readonly context: (
    directory: string,
    deep: boolean,
    pattern: RegExp,
  ) => Readonly<{ keys: () => string[] }> & ((key: string) => unknown);
}

declare const require: WebpackRequire;

const scripts = require.context("../pages", true, /^\.\/[a-z0-9-]+\/script\.ts$/u);
const videos = require.context("../pages", true, /^\.\/[a-z0-9-]+\/video\.tsx$/u);

const SEPARATOR = "/";
const SLUG_AT = 1;

const slugOf = (key: string): string =>
  pipe(
    Str.split(SEPARATOR)(key),
    Arr.get(SLUG_AT),
    Option.getOrElse(() => key),
  );

const exportOf = (loaded: unknown, name: string): Option.Option<unknown> =>
  pipe(
    Option.liftPredicate(
      loaded,
      (module): module is Readonly<Record<string, unknown>> =>
        typeof module === "object" && module !== null,
    ),
    Option.flatMap((module) => Rec.get(module, name)),
  );

/** @internal */
export interface VideoSource {
  readonly slug: string;
  readonly script: VideoScript;
}

const isScript = (value: unknown): value is VideoScript =>
  typeof value === "object" && value !== null && "cuts" in value;

/** @internal */
export const videoSources = (): readonly VideoSource[] =>
  pipe(
    scripts.keys(),
    Arr.flatMap((key) =>
      pipe(
        exportOf(scripts(key), "script"),
        Option.filter(isScript),
        Option.map((script) => ({ slug: slugOf(key), script })),
        Option.toArray,
      ),
    ),
  );

const isDraw = (value: unknown): value is Readonly<Record<string, Draw>> =>
  typeof value === "object" && value !== null;

const NO_DRAW: Readonly<Record<string, Draw>> = {};

/** @internal */
export const drawOf = (slug: string): Readonly<Record<string, Draw>> =>
  pipe(
    videos.keys(),
    Arr.findFirst((key) => slugOf(key) === slug),
    Option.flatMap((key) => exportOf(videos(key), "draw")),
    Option.filter(isDraw),
    Option.getOrElse(() => NO_DRAW),
  );

const isLook = (value: unknown): value is Partial<Look> =>
  typeof value === "object" && value !== null;

const NO_LOOK: Partial<Look> = {};

/** @internal */
export const lookOf = (slug: string): Partial<Look> =>
  pipe(
    videos.keys(),
    Arr.findFirst((key) => slugOf(key) === slug),
    Option.flatMap((key) => exportOf(videos(key), "look")),
    Option.filter(isLook),
    Option.getOrElse(() => NO_LOOK),
  );
