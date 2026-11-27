import type { VideoScript } from "@masseater.dev/video-kit/script";
import { SFX } from "@masseater.dev/video-kit/script";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import type { Config, PlatformError } from "effect";
import type { HttpClient } from "effect/http";

import { assetPath } from "#/shared/config/index.ts";
import { projectPaths, readScript } from "#/shared/lib/project.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

import type { Asset, PageAsset } from "./asset.ts";
import { downloadDirect } from "./download-direct.ts";
import { downloadFromPages } from "./download-from-pages.ts";

/** @internal */
export type Services = FileSystem.FileSystem | Path.Path | HttpClient.HttpClient;
/** @internal */
export type Failure = VideoError | PlatformError.PlatformError | Config.ConfigError;

interface Source {
  readonly url: string;
  readonly page?: string;
}

const REMOTE = "https://";
const NO_IMAGES: Readonly<Record<string, string>> = {};

const assetOf = ({ url, page }: Source): Asset => ({ url, page: Option.fromNullishOr(page) });

const imagesOf = (script: VideoScript): readonly Source[] =>
  pipe(
    Option.getOrElse(Option.fromNullishOr(script.images), () => NO_IMAGES),
    Rec.values,
    Arr.filter(Str.startsWith(REMOTE)),
    Arr.map((url): Source => ({ url })),
  );

const assetsOf = (script: VideoScript): readonly Asset[] =>
  pipe(
    [...Rec.values(SFX), ...Arr.fromNullishOr(script.bgm), ...imagesOf(script)],
    Arr.map(assetOf),
  );

const fileOf = (url: string): Effect.Effect<string, never, Path.Path> =>
  Effect.gen(function* file() {
    const path = yield* Path.Path;
    const paths = yield* projectPaths;
    return path.join(paths.public, assetPath(url));
  });

const missingOf = (
  assets: readonly Asset[],
): Effect.Effect<
  readonly Asset[],
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* missing() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* Effect.filter(
      assets,
      ({ url }) =>
        fileOf(url).pipe(
          Effect.tap((file) => fileSystem.makeDirectory(path.dirname(file), { recursive: true })),
          Effect.flatMap((file) => fileSystem.exists(file)),
          Effect.map((exists) => !exists),
        ),
      { concurrency: "unbounded" },
    );
  });

const onPages = (assets: readonly Asset[]): readonly PageAsset[] =>
  pipe(
    assets,
    Arr.flatMap(({ url, page }) =>
      pipe(
        page,
        Option.map((listing) => ({ url, page: listing })),
        Option.toArray,
      ),
    ),
  );

/** @internal */
export const fetchAssets = (slug: string): Effect.Effect<readonly string[], Failure, Services> =>
  Effect.gen(function* fetchAll() {
    const script = yield* readScript(slug);
    const missing = yield* missingOf(assetsOf(script));
    const direct = pipe(
      missing,
      Arr.filter(({ page }) => Option.isNone(page)),
    );
    yield* Effect.forEach(
      direct,
      ({ url }) => fileOf(url).pipe(Effect.flatMap((file) => downloadDirect({ url, file }))),
      {
        concurrency: 1,
      },
    );
    yield* downloadFromPages({ assets: onPages(missing), fileOf });
    return pipe(
      missing,
      Arr.map(({ url }) => url),
    );
  });
