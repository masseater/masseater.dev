import type { Timeline } from "@masseater.dev/video-kit/script";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { Effect, FileSystem, Option, Path, String as Str } from "effect";
import type { Config, PlatformError } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import { REMOTION_BROWSER } from "#/shared/config/index.ts";
import { projectPaths } from "#/shared/lib/project.ts";
import { failedWith } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";
import { webpackOverride } from "#/shared/lib/webpack.ts";

import { normalizeLoudness } from "./ffmpeg.ts";

const SHOWN_AT = 0.7;
const DIGITS = 2;
const ONE = 1;
const NO_PROPS = {};

/** @internal */
export type Failure = VideoError | PlatformError.PlatformError | Config.ConfigError;

const attempt = <Value>(run: () => Promise<Value>): Effect.Effect<Value, VideoError> =>
  Effect.tryPromise({ try: run, catch: failedWith });

const serve: Effect.Effect<string, VideoError, Path.Path> = Effect.gen(function* serveBundle() {
  const path = yield* Path.Path;
  const paths = yield* projectPaths;
  return yield* attempt(() =>
    bundle({
      entryPoint: path.join(paths.root, "src/app/index.ts"),
      publicDir: paths.public,
      webpackOverride,
    }),
  );
});

interface Prepared {
  readonly serveUrl: string;
  readonly composition: Awaited<ReturnType<typeof selectComposition>>;
  readonly browserExecutable: string | null;
}

const prepare = (id: string): Effect.Effect<Prepared, VideoError | Config.ConfigError, Path.Path> =>
  Effect.gen(function* prepareComposition() {
    const browser = yield* REMOTION_BROWSER;
    const browserExecutable = Option.getOrNull(browser);
    const serveUrl = yield* serve;
    const composition = yield* attempt(() =>
      selectComposition({ serveUrl, id, inputProps: NO_PROPS, browserExecutable }),
    );
    return { serveUrl, composition, browserExecutable };
  });

/** @internal */
export interface RenderRequest {
  readonly slug: string;
  readonly timelines: readonly Timeline[];
}

const stills = (
  slug: string,
  timeline: Timeline,
): Effect.Effect<readonly string[], Failure, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* renderStills() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const paths = yield* projectPaths;
    const { serveUrl, composition, browserExecutable } = yield* prepare(
      `${slug}-${timeline.format}`,
    );
    const directory = path.join(paths.out, slug, "review", timeline.format);
    yield* fileSystem.makeDirectory(directory, { recursive: true });
    return yield* Effect.forEach(
      timeline.cuts,
      ({ id, from, duration }, position) => {
        const output = path.join(
          directory,
          `${Str.padStart(DIGITS, "0")(String(position + ONE))}-${id}.png`,
        );
        const frame = from + Math.floor(duration * SHOWN_AT);
        return attempt(() =>
          renderStill({
            serveUrl,
            composition,
            frame,
            output,
            inputProps: composition.props,
            browserExecutable,
          }),
        ).pipe(Effect.as(output));
      },
      { concurrency: 1 },
    );
  });

/** @internal */
export const renderReview = ({
  slug,
  timelines,
}: RenderRequest): Effect.Effect<readonly string[], Failure, FileSystem.FileSystem | Path.Path> =>
  Effect.forEach(timelines, (timeline) => stills(slug, timeline), { concurrency: 1 }).pipe(
    Effect.map((all) => all.flat()),
  );

const video = (
  slug: string,
  timeline: Timeline,
): Effect.Effect<
  string,
  Failure,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* renderOne() {
    const path = yield* Path.Path;
    const paths = yield* projectPaths;
    const { serveUrl, composition, browserExecutable } = yield* prepare(
      `${slug}-${timeline.format}`,
    );
    const outputLocation = path.join(paths.out, slug, `${slug}-${timeline.format}.mp4`);
    yield* attempt(() =>
      renderMedia({
        serveUrl,
        composition,
        codec: "h264",
        outputLocation,
        inputProps: composition.props,
        browserExecutable,
      }),
    );
    yield* normalizeLoudness(outputLocation);
    return outputLocation;
  });

/** @internal */
export const renderVideo = ({
  slug,
  timelines,
}: RenderRequest): Effect.Effect<
  readonly string[],
  Failure,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
> => Effect.forEach(timelines, (timeline) => video(slug, timeline), { concurrency: 1 });
