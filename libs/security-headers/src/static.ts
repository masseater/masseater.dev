import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";

import { ASSET_CACHE_CONTROL, SECURITY_HEADERS } from "./index.ts";

type PageHeaders = Readonly<{ path: string; headers: Readonly<Record<string, string>> }>;

type PageHashes = Readonly<{ page: string; hashes: readonly string[] }>;

const encoder = new TextEncoder();
const INDEX_PAGE = /(?<=^|\/)index\.html$/u;
const HTML_EXTENSION = /\.html$/u;
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>(?<body>[\s\S]*?)<\/script>/gu;
const MAX_RULES = 100;

const headerLines = (headers: Readonly<Record<string, string>>): readonly string[] =>
  pipe(
    Rec.toEntries(headers),
    Arr.map(([name, value]) => `  ${name}: ${value}`),
  );

const detachLines = (headers: Readonly<Record<string, string>>): readonly string[] =>
  pipe(
    Rec.keys(headers),
    Arr.map((name) => `  ! ${name}`),
  );

const pageRule = ({ path, headers }: PageHeaders): readonly string[] => [
  path,
  ...detachLines(headers),
  ...headerLines(headers),
];

const immutableRule = (path: string): readonly string[] => [
  path,
  `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
];

const headersFileFor =
  (immutablePaths: readonly string[]) =>
  ({
    documentHeaders,
    pages,
  }: Readonly<{
    documentHeaders: Readonly<Record<string, string>>;
    pages: readonly PageHeaders[];
  }>): string => {
    const rules = [
      ["/*", ...headerLines(SECURITY_HEADERS), ...headerLines(documentHeaders)],
      ...pipe(pages, Arr.map(pageRule)),
      ...pipe(immutablePaths, Arr.map(immutableRule)),
    ];
    if (rules.length > MAX_RULES) {
      throw new RangeError(`_headers は ${MAX_RULES} 個までのルールしか持てない: ${rules.length}`);
    }
    return pipe(rules, Arr.flatten, Arr.append(""), Arr.join("\n"));
  };

const sourceHash = (body: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", encoder.encode(body))).pipe(
    Effect.map((digest) => `'sha256-${Base64.encode(new Uint8Array(digest))}'`),
  );

const scriptBodies = (html: string): readonly string[] =>
  pipe(
    html,
    Str.matchAll(INLINE_SCRIPT),
    Arr.fromIterable,
    Arr.map((match) =>
      pipe(
        Option.fromNullishOr(match.groups),
        Option.flatMap(Rec.get("body")),
        Option.getOrElse(() => ""),
      ),
    ),
  );

const inlineScriptHashes = (html: string): Effect.Effect<readonly string[]> =>
  pipe(scriptBodies(html), Arr.dedupe, Effect.forEach(sourceHash));

const pageSlug = (page: string): string =>
  pipe(page, Str.replace(INDEX_PAGE, ""), Str.replace(HTML_EXTENSION, ""));

const pageHashes = <Failure, Requirements>({
  entries,
  read,
}: Readonly<{
  entries: readonly string[];
  read: (page: string) => Effect.Effect<string, Failure, Requirements>;
}>): Effect.Effect<readonly PageHashes[], Failure, Requirements> =>
  pipe(
    entries,
    Arr.filter(Str.endsWith(".html")),
    Effect.forEach((page) =>
      read(page).pipe(
        Effect.flatMap(inlineScriptHashes),
        Effect.map((hashes): PageHashes => ({ page, hashes })),
      ),
    ),
  );

export { headerLines, headersFileFor, inlineScriptHashes, pageSlug, pageHashes, sourceHash };
export type { PageHashes, PageHeaders };
