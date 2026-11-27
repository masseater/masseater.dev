import { browserSpans } from "@r_masseater/workers-tracing/browser-spans";
import { run } from "@r_masseater/workers-tracing/effect";
import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";

import { isUnindexedPath } from "#/entities/entry/index.ts";
import { handleStars } from "#/features/star-songs/index.server.ts";
import type { StarBindings } from "#/features/star-songs/index.server.ts";
import {
  IMAGE_HEADERS,
  SECURITY_HEADERS,
  contentSecurityPolicy,
  site,
} from "#/shared/config/index.ts";
import { securityTxt } from "#/shared/lib/security-txt.ts";

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

const mediaHeaders = (contentType: string): [string, string][] =>
  pipe(
    Option.liftPredicate(IMAGE_HEADERS, () => Str.startsWith("image/")(contentType)),
    Option.match({ onNone: () => [], onSome: Rec.toEntries }),
  );

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

const receiveSpans = browserSpans({ service: site.telemetryService });

const isTraces = (request: Request): boolean => new URL(request.url).pathname === site.tracesPath;

export type SiteBindings = StarBindings &
  Readonly<{ ASSETS: Readonly<{ fetch: (request: Request) => Promise<Response> }> }>;

export type Rewriter = Readonly<{
  on: (
    selector: string,
    handlers: Readonly<{
      element: (element: Readonly<{ setAttribute: (name: string, value: string) => void }>) => void;
    }>,
  ) => Rewriter;
  transform: (response: Response) => Response;
}>;

export type SiteDependencies = Readonly<{ bindings: SiteBindings; rewriter: () => Rewriter }>;

const page = (bindings: SiteBindings, request: Request): Promise<Response> =>
  Option.match(Option.liftPredicate(request, isStarsApi), {
    onNone: () => bindings.ASSETS.fetch(assetRequest(request)),
    onSome: handleStars(bindings),
  });

const isSecurityTxt = (request: Request): boolean =>
  new URL(request.url).pathname === site.securityTxtPath;

const served = (bindings: SiteBindings, request: Request): Promise<Response> | Response =>
  Option.match(Option.liftPredicate(request, isSecurityTxt), {
    onNone: () => page(bindings, request),
    onSome: () => run(securityTxt),
  });

const upstream = (bindings: SiteBindings, request: Request): Promise<Response> | Response =>
  Option.match(Option.liftPredicate(request, isTraces), {
    onNone: () => served(bindings, request),
    onSome: receiveSpans,
  });

const newNonce = (): string => Base64.encode(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)));

const nonceRewriter = (rewriter: () => Rewriter, nonce: string): Rewriter =>
  rewriter().on("script, style", {
    element: (element) => {
      element.setAttribute("nonce", nonce);
    },
  });

const cspHeader = (nonce: string): [string, string] => [
  "Content-Security-Policy",
  contentSecurityPolicy(nonce),
];

export const serveSite =
  ({ bindings, rewriter }: SiteDependencies) =>
  (request: Request): Promise<Response> =>
    run(
      Effect.promise(() => Promise.resolve(upstream(bindings, request))).pipe(
        Effect.map((response) => {
          const fixed = fixedHeaders(new URL(request.url).pathname);
          const init = { status: response.status, statusText: response.statusText };
          const entries: HeaderEntries = [...response.headers.entries()];
          const contentType = response.headers.get("Content-Type") ?? "";
          return Option.match(
            Option.liftPredicate(response, () => Str.startsWith("text/html")(contentType)),
            {
              onNone: () =>
                new Response(response.body, {
                  ...init,
                  headers: overriding(entries, [], [...fixed, ...mediaHeaders(contentType)]),
                }),
              onSome: (document) => {
                const nonce = newNonce();
                const headers = overriding(entries, RESPONSE_VALIDATORS, [
                  ...fixed,
                  cspHeader(nonce),
                ]);
                const { body } = nonceRewriter(rewriter, nonce).transform(document);
                return new Response(body, { ...init, headers });
              },
            },
          );
        }),
      ),
    );

const worker: ExportedHandler<SiteBindings> = {
  fetch: (request, env) =>
    serveSite({ bindings: env, rewriter: () => new HTMLRewriter() })(request),
};

export default worker;
