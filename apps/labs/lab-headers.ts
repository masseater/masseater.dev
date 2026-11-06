import { headerLines, sourceHash } from "@masseater.dev/static-headers";
import { webAnalyticsBeacon } from "@masseater.dev/ui/web-analytics";
import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import type { Plugin, Rolldown } from "vite-plus";

import { CF_BEACON_TOKEN } from "./cloudflare.ts";
import { ASSETS_DIR, PAGE_SCRIPT_SOURCES } from "./pages.ts";
import {
  ASSET_CACHE_CONTROL,
  SECURITY_HEADERS,
  contentSecurityPolicy,
} from "./security-headers.ts";

const HEADERS_FILE = "_headers";
const PAGE_HTML = /^(?<page>[^/]+)\/index\.html$/u;
const INLINE_STYLE = /<style[^>]*>(?<body>[\s\S]*?)<\/style>/gu;

type PageStyles = Readonly<{ page: string; hashes: readonly string[] }>;

const group =
  (name: string) =>
  (groups: Readonly<Record<string, string>> | undefined): Option.Option<string> =>
    pipe(Option.fromNullishOr(groups), Option.flatMap(Rec.get(name)));

const styleBodies = (html: string): readonly string[] =>
  pipe(
    html,
    Str.matchAll(INLINE_STYLE),
    Arr.fromIterable,
    Arr.flatMap((match) => Option.toArray(group("body")(match.groups))),
  );

const pageRule = ({ page, hashes }: PageStyles): readonly string[] => [
  `/${page}/*`,
  ...headerLines(SECURITY_HEADERS),
  `  Content-Security-Policy: ${contentSecurityPolicy({
    scriptSources: pipe(
      Rec.get(PAGE_SCRIPT_SOURCES, page),
      Option.getOrElse((): readonly string[] => []),
    ),
    styleHashes: hashes,
  })}`,
];

const headersFile = (pages: readonly PageStyles[]): string =>
  pipe(
    [
      ...pipe(pages, Arr.flatMap(pageRule)),
      `/${ASSETS_DIR}/*`,
      ...headerLines(SECURITY_HEADERS),
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      "",
    ],
    Arr.join("\n"),
  );

type HtmlFile = Readonly<{ fileName: string; html: string }>;

const pageOf = (fileName: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(PAGE_HTML.exec(fileName)),
    Option.flatMap((match) => group("page")(match.groups)),
  );

const pageStyles = ({ fileName, html }: HtmlFile): Option.Option<Effect.Effect<PageStyles>> =>
  pipe(
    pageOf(fileName),
    Option.map((page) =>
      pipe(
        styleBodies(html),
        Arr.dedupe,
        Effect.forEach(sourceHash),
        Effect.map((hashes) => ({ page, hashes })),
      ),
    ),
  );

const bundleHeaders = (files: readonly HtmlFile[]): Effect.Effect<string> =>
  pipe(
    files,
    Arr.flatMap((file) => Option.toArray(pageStyles(file))),
    (styles) => Effect.all(styles),
    Effect.map(headersFile),
  );

const beacon = webAnalyticsBeacon(CF_BEACON_TOKEN);

const labHeaders = (): Plugin => ({
  name: "lab-headers",
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "script",
      attrs: {
        defer: true,
        src: beacon.src,
        integrity: beacon.integrity,
        crossorigin: beacon.crossOrigin,
        "data-cf-beacon": beacon["data-cf-beacon"],
      },
      injectTo: "head",
    },
  ],
  generateBundle: {
    order: "post",
    handler(_options, bundle) {
      const files = pipe(
        Rec.values(bundle),
        Arr.filter((output): output is Rolldown.OutputAsset => output.type === "asset"),
        Arr.flatMap(({ fileName, source }) =>
          pipe(
            Option.liftPredicate(source, Str.isString),
            Option.map((html) => ({ fileName, html })),
            Option.toArray,
          ),
        ),
      );
      return Effect.runPromise(
        bundleHeaders(files).pipe(
          Effect.flatMap((source) =>
            Effect.sync(() => this.emitFile({ type: "asset", fileName: HEADERS_FILE, source })),
          ),
          Effect.asVoid,
        ),
      );
    },
  },
});

export { labHeaders };
