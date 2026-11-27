import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import type { Config, Path, Scope } from "effect";
import { chromium } from "playwright-core";

import { DOWNLOAD_BROWSER } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

import type { PageAsset } from "./asset.ts";

const SEPARATOR = "/";
const TERMS = "#tos-check";
const TERMS_DOWNLOAD = "#song-dlbtn";
const NO_NAME = "";
const NONE = 0;

const nameOf = (url: string): string =>
  pipe(
    new URL(url).pathname,
    Str.split(SEPARATOR),
    Arr.last,
    Option.getOrElse(() => NO_NAME),
  );

const attempt = <Value>(run: () => Promise<Value>): Effect.Effect<Value, VideoError> =>
  Effect.tryPromise({ try: run, catch: failedWith });

/** @internal */
export interface PagesRequest {
  readonly assets: readonly PageAsset[];
  readonly fileOf: (url: string) => Effect.Effect<string, never, Path.Path>;
}

const listingsOf = (assets: readonly PageAsset[]): readonly string[] =>
  pipe(
    assets,
    Arr.groupBy(({ page }) => page),
    Rec.keys,
  );

const session = ({
  assets,
  fileOf,
}: PagesRequest): Effect.Effect<void, VideoError | Config.ConfigError, Path.Path | Scope.Scope> =>
  Effect.gen(function* browse() {
    const executablePath = yield* DOWNLOAD_BROWSER;
    const browser = yield* Effect.acquireRelease(
      attempt(() => chromium.launch({ executablePath })),
      (opened) => Effect.promise(() => opened.close()),
    );
    const context = yield* attempt(() => browser.newContext({ acceptDownloads: true }));
    const page = yield* attempt(() => context.newPage());
    const clickDownload = (url: string): Effect.Effect<void, VideoError> =>
      Effect.gen(function* click() {
        const terms = page.locator(TERMS);
        const count = yield* attempt(() => terms.count());
        if (count > NONE) {
          yield* attempt(() => terms.check());
          yield* attempt(() => page.locator(TERMS_DOWNLOAD).click());
          return;
        }
        yield* attempt(() =>
          page
            .locator(`a[href$="${nameOf(url)}"]`)
            .first()
            .click(),
        );
      });
    const download = (asset: PageAsset): Effect.Effect<void, VideoError, Path.Path> =>
      Effect.gen(function* click() {
        const file = yield* fileOf(asset.url);
        const [started] = yield* Effect.all(
          [attempt(() => page.waitForEvent("download")), clickDownload(asset.url)],
          { concurrency: "unbounded" },
        );
        yield* attempt(() => started.saveAs(file));
      });
    const visit = (listing: string): Effect.Effect<void, VideoError, Path.Path> =>
      Effect.gen(function* listingPage() {
        yield* attempt(() => page.goto(listing, { waitUntil: "domcontentloaded" }));
        const here = pipe(
          assets,
          Arr.filter((asset) => asset.page === listing),
        );
        yield* Effect.forEach(here, download, { concurrency: 1 });
      });
    yield* Effect.forEach(listingsOf(assets), visit, { concurrency: 1 });
  });

/** @internal */
export const downloadFromPages = (
  request: PagesRequest,
): Effect.Effect<void, VideoError | Config.ConfigError, Path.Path> => {
  if (Arr.isReadonlyArrayEmpty(request.assets)) {
    return Effect.void;
  }
  return Effect.scoped(session(request));
};
