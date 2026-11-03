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

type HeaderEntries = readonly (readonly [string, string])[];

const overriding = (
  source: HeaderEntries,
  removed: readonly string[],
  entries: HeaderEntries,
): Headers => {
  const headers = new Headers();
  for (const [name, value] of source) {
    headers.append(name, value);
  }
  for (const name of removed) {
    headers.delete(name);
  }
  for (const [name, value] of entries) {
    headers.set(name, value);
  }
  return headers;
};

const fixedHeaders = (pathname: string): [string, string][] => [
  ...Rec.toEntries(SECURITY_HEADERS),
  ...pipe(
    Option.liftPredicate(NOINDEX, () => isUnindexedPath(pathname)),
    Option.match({ onNone: () => [], onSome: Rec.toEntries }),
  ),
];

const isDocumentRequest = (request: Request): boolean =>
  Arr.contains(DOCUMENT_DESTINATIONS, request.headers.get("Sec-Fetch-Dest") ?? "");

const withoutValidators = (request: Request): Request =>
  new Request(request, {
    headers: overriding([...request.headers.entries()], REQUEST_VALIDATORS, []),
  });

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
            const headers = overriding(entries, [], fixed);
            return new Response(response.body, { ...init, headers });
          }
          const nonce = newNonce();
          const headers = overriding(entries, RESPONSE_VALIDATORS, [...fixed, cspHeader(nonce)]);
          const { body } = nonceRewriter(nonce).transform(response);
          return new Response(body, { ...init, headers });
        }),
      ),
    ),
};

export default worker;
