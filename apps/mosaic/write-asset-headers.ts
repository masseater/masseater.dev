import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { pageSlug, pageHashes } from "@masseater.dev/static-headers";
import type { PageHeaders } from "@masseater.dev/static-headers";
import { Array as Arr, Effect, FileSystem, Layer, Option, Path, pipe } from "effect";

import { assetHeaders } from "./asset-headers.ts";
import { BASE_PATH } from "./base-path.ts";
import { contentSecurityPolicy } from "./security-headers.ts";
import { SEARCH_INDEX_ORIGIN } from "./src/shared/config/search.ts";

const OUTDIR = "dist/client";
const HEADERS_FILE = "_headers";
const NOT_FOUND_PAGE = "404.html";

const contentSecurityPolicyHeader = (
  hashes: readonly string[],
): Readonly<Record<string, string>> => ({
  "Content-Security-Policy": contentSecurityPolicy(hashes),
});

const documentHeaders = (hashes: readonly string[]): Readonly<Record<string, string>> => ({
  ...contentSecurityPolicyHeader(hashes),
  ...Option.match(SEARCH_INDEX_ORIGIN, {
    onNone: () => ({ "X-Robots-Tag": "noindex" }),
    onSome: () => ({}),
  }),
});

const pagePath = (page: string): string => `${BASE_PATH}/${pageSlug(page)}`;

const isNotFound = ({ page }: Readonly<{ page: string }>): boolean => page === NOT_FOUND_PAGE;

const program = Effect.gen(function* write() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = yield* fileSystem.readDirectory(OUTDIR, { recursive: true });
  const pages = yield* pageHashes({
    entries,
    read: (page) => fileSystem.readFileString(path.join(OUTDIR, page)),
  });
  const notFoundHashes = pipe(
    pages,
    Arr.filter(isNotFound),
    Arr.flatMap(({ hashes }) => hashes),
  );
  const pageHeaders: readonly PageHeaders[] = pipe(
    pages,
    Arr.filter((entry) => !isNotFound(entry)),
    Arr.map(({ page, hashes }) => ({
      path: pagePath(page),
      headers: contentSecurityPolicyHeader(hashes),
    })),
  );
  yield* fileSystem.writeFileString(
    path.join(OUTDIR, HEADERS_FILE),
    assetHeaders({ documentHeaders: documentHeaders(notFoundHashes), pages: pageHeaders }),
  );
});

NodeRuntime.runMain(
  Layer.build(NodeServices.layer).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(program.pipe(Effect.withSpan("build.asset-headers")), context),
    ),
    Effect.scoped,
  ),
);
