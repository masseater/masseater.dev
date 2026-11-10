import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import { afterAll, beforeEach, expect, test, vi } from "vite-plus/test";

import {
  HTMLRewriter,
  MISSING_ARTICLE,
  changeSalt,
  closeDatabase,
  lastAssetRequest,
  resetSite,
  storedVisitors,
} from "./site.worker.test.support.ts";
import worker from "./site.worker.ts";

vi.mock("cloudflare:workers", () => import("./site.worker.test.support.ts"));

vi.stubGlobal("HTMLRewriter", HTMLRewriter);

beforeEach(() => Effect.runPromise(resetSite));

afterAll(() => Effect.runPromise(closeDatabase));

const ORIGIN = "https://masseater.dev";

const ARTICLE = "/api/stars/blogs/hello";

const IP = "192.0.2.1";

const OTHER_IP = "198.51.100.7";

const NOT_FOUND = 404;

const BOTH_SALTS = 2;

const ONE_NONCE = 1;

const NONCE_IN_POLICY = /'nonce-(?<nonce>[^']+)'/gu;

const NONCE_ON_TAG = /<(?:script|style)\b[^>]*\snonce="(?<nonce>[^"]+)"/gu;

const OPENING_TAGS = /<(?:script|style)\b/gu;

const SHA256_HEX = /^[0-9a-f]{64}$/u;

const fetchSite = (request: Request): Effect.Effect<Response> =>
  Effect.promise(() => worker.fetch(request));

const fromIp = (path: string, method: string, ip: string): Effect.Effect<Response> =>
  fetchSite(new Request(`${ORIGIN}${path}`, { method, headers: { "cf-connecting-ip": ip } }));

const jsonOf = (response: Response): Effect.Effect<unknown> =>
  Effect.promise(() => response.json());

const textOf = (response: Response): Effect.Effect<string> => Effect.promise(() => response.text());

const page = fetchSite(new Request(`${ORIGIN}/`, { headers: { "Sec-Fetch-Dest": "document" } }));

const noncesIn = (text: string, pattern: RegExp): readonly string[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(pattern)(text)),
    Arr.map(({ groups }) =>
      pipe(
        Option.fromNullishOr(groups),
        Option.flatMap((found) => Rec.get(found, "nonce")),
      ),
    ),
    Arr.getSomes,
  );

const policyOf = (response: Response): string =>
  response.headers.get("Content-Security-Policy") ?? "";

const firstNonce = (response: Response): Option.Option<string> =>
  Arr.head(noncesIn(policyOf(response), NONCE_IN_POLICY));

test("同じ IP から 2 回付けた star は 1 つと数える", () =>
  Effect.runPromise(
    Effect.gen(function* starTwice() {
      yield* fromIp(ARTICLE, "PUT", IP);
      const second = yield* fromIp(ARTICLE, "PUT", IP).pipe(Effect.flatMap(jsonOf));
      const seen = yield* fromIp(ARTICLE, "GET", OTHER_IP).pipe(Effect.flatMap(jsonOf));
      expect(second).toStrictEqual({ status: "found", count: 1, starred: true });
      expect(seen).toStrictEqual({ status: "found", count: 1, starred: false });
    }),
  ));

test("IP はそのまま置かず、ソルトを混ぜたハッシュで置く", () =>
  Effect.runPromise(
    Effect.gen(function* starWithTwoSalts() {
      yield* fromIp(ARTICLE, "PUT", IP);
      yield* changeSalt("second-salt");
      yield* fromIp(ARTICLE, "PUT", IP);
      const visitors = yield* storedVisitors;
      const hashed = pipe(
        visitors,
        Arr.every((visitor) => SHA256_HEX.test(visitor)),
      );
      const leaked = pipe(visitors, Arr.some(Str.includes(IP)));
      expect(Arr.dedupe(visitors)).toHaveLength(BOTH_SALTS);
      expect(hashed).toBe(true);
      expect(leaked).toBe(false);
    }),
  ));

test("無い記事には star を付けない", () =>
  Effect.runPromise(
    Effect.gen(function* starMissing() {
      const answer = yield* fromIp(`/api/stars${MISSING_ARTICLE}`, "PUT", IP).pipe(
        Effect.flatMap(jsonOf),
      );
      const visitors = yield* storedVisitors;
      expect(answer).toStrictEqual({ status: "missing" });
      expect(visitors).toStrictEqual([]);
    }),
  ));

test("star の API が持たないメソッドは断り、何も書かない", () =>
  Effect.runPromise(
    Effect.gen(function* postStar() {
      const response = yield* fromIp(ARTICLE, "POST", IP);
      const visitors = yield* storedVisitors;
      expect(response.status).toBe(NOT_FOUND);
      expect(visitors).toStrictEqual([]);
    }),
  ));

test("API でないリクエストは静的アセットに渡し、画像には CORP を付ける", () =>
  Effect.runPromise(
    Effect.gen(function* fetchImage() {
      const response = yield* fetchSite(new Request(`${ORIGIN}/images/cover.png`));
      const body = yield* textOf(response);
      expect(body).toBe("png");
      expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
      expect(response.headers.get("ETag")).toBe('"image"');
      const forwarded = yield* lastAssetRequest.pipe(Effect.map(Option.map(({ url }) => url)));
      expect(forwarded).toStrictEqual(Option.some(`${ORIGIN}/images/cover.png`));
    }),
  ));

test("文書のリクエストは検証用のヘッダを外してアセットに渡す", () =>
  Effect.runPromise(
    Effect.gen(function* fetchDocument() {
      yield* fetchSite(
        new Request(`${ORIGIN}/`, {
          headers: { "Sec-Fetch-Dest": "document", "If-None-Match": '"page"' },
        }),
      );
      const validated = yield* lastAssetRequest.pipe(
        Effect.map(Option.map(({ headers }) => headers.has("If-None-Match"))),
      );
      expect(validated).toStrictEqual(Option.some(false));
    }),
  ));

test("HTML の script と style には CSP のヘッダと同じ nonce を付ける", () =>
  Effect.runPromise(
    Effect.gen(function* fetchPage() {
      const response = yield* page;
      const body = yield* textOf(response);
      const declared = Arr.dedupe(noncesIn(policyOf(response), NONCE_IN_POLICY));
      const tags = Arr.fromIterable(Str.matchAll(OPENING_TAGS)(body));
      expect(declared).toHaveLength(ONE_NONCE);
      const expected = pipe(
        tags,
        Arr.flatMap(() => declared),
      );
      expect(noncesIn(body, NONCE_ON_TAG)).toStrictEqual(expected);
      expect(response.headers.has("ETag")).toBe(false);
      expect(response.headers.has("Last-Modified")).toBe(false);
    }),
  ));

test("nonce はレスポンスごとに作り直す", () =>
  Effect.runPromise(
    Effect.gen(function* fetchPageTwice() {
      const first = yield* page.pipe(Effect.map(firstNonce));
      const second = yield* page.pipe(Effect.map(firstNonce));
      expect(first).not.toStrictEqual(second);
    }),
  ));
