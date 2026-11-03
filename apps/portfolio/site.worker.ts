import { env } from "cloudflare:workers";
import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";

import { isUnindexedPath } from "#/entities/entry/model/category";
import { starRoutes } from "#/features/star/index.server";
import { site } from "#/shared/config";

import { SECURITY_HEADERS, contentSecurityPolicy } from "./security-headers.ts";

const NONCE_BYTES = 16;

const DOCUMENT_DESTINATIONS: readonly string[] = ["document", "iframe"];

const REQUEST_VALIDATORS: readonly string[] = ["if-none-match", "if-modified-since"];

const RESPONSE_VALIDATORS: readonly string[] = ["etag", "last-modified"];

const NOINDEX = { "X-Robots-Tag": "noindex" } as const;

const FIXED_NAMES: readonly string[] = pipe(
  [...Rec.keys(SECURITY_HEADERS), ...Rec.keys(NOINDEX)],
  Arr.map(Str.toLowerCase),
);

type HeaderEntries = readonly (readonly [string, string])[];

const without = (entries: HeaderEntries, names: readonly string[]): [string, string][] =>
  pipe(
    entries,
    Arr.filter(([name]) => !Arr.contains(names, Str.toLowerCase(name))),
    Arr.map(([name, value]): [string, string] => [name, value]),
  );

const fixedHeaders = (pathname: string): [string, string][] => [
  ...Rec.toEntries(SECURITY_HEADERS),
  ...pipe(
    Option.liftPredicate(NOINDEX, () => isUnindexedPath(pathname)),
    Option.match({ onNone: () => [], onSome: Rec.toEntries }),
  ),
];

const isDocumentRequest = (request: Request): boolean =>
  Arr.contains(DOCUMENT_DESTINATIONS, request.headers.get("Sec-Fetch-Dest") ?? "");

const requestEntries = (request: Request): HeaderEntries => [...request.headers.entries()];

const withoutValidators = (request: Request): Request => {
  const headers = new Headers(without(requestEntries(request), REQUEST_VALIDATORS));
  return new Request(request, { headers });
};

const assetRequest = (request: Request): Request =>
  Option.match(Option.liftPredicate(request, isDocumentRequest), {
    onNone: () => request,
    onSome: withoutValidators,
  });

const isStarsApi = (request: Request): boolean =>
  Str.startsWith(`${site.starsApiPath}/`)(new URL(request.url).pathname);

const upstream = (request: Request): Promise<Response> | Response =>
  Option.match(Option.liftPredicate(request, isStarsApi), {
    onNone: () => env.ASSETS.fetch(assetRequest(request)),
    onSome: (api) => starRoutes.handle(api),
  });

const newNonce = (): string => Base64.encode(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)));

const nonceRewriter = (nonce: string): HTMLRewriter =>
  new HTMLRewriter().on("script, style", {
    element: (element) => {
      element.setAttribute("nonce", nonce);
    },
  });

const cspHeader = (nonce: string): [string, string] => [
  "Content-Security-Policy",
  contentSecurityPolicy(nonce),
];

const worker = {
  fetch: (request: Request): Promise<Response> =>
    Effect.runPromise(
      Effect.promise(() => Promise.resolve(upstream(request))).pipe(
        Effect.map((response) => {
          const fixed = fixedHeaders(new URL(request.url).pathname);
          const init = { status: response.status, statusText: response.statusText };
          const entries: HeaderEntries = [...response.headers.entries()];
          if (!Str.startsWith("text/html")(response.headers.get("Content-Type") ?? "")) {
            const headers = new Headers([...without(entries, FIXED_NAMES), ...fixed]);
            return new Response(response.body, { ...init, headers });
          }
          const nonce = newNonce();
          const { body } = nonceRewriter(nonce).transform(response);
          const headers = [
            ...without(entries, [...RESPONSE_VALIDATORS, ...FIXED_NAMES]),
            ...fixed,
            cspHeader(nonce),
          ];
          return new Response(body, { ...init, headers: new Headers(headers) });
        }),
      ),
    ),
};

export default worker;
