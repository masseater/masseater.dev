import {
  Array as Arr,
  Clock,
  Effect,
  Number as Num,
  Option,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { afterAll, beforeEach, expect, test } from "vite-plus/test";

import {
  MISSING_ARTICLE,
  changeSalt,
  closeDatabase,
  flood,
  forgetReturnedRows,
  lastAssetRequest,
  limitedKeys,
  resetSite,
  returnedRows,
  site,
  storedVisitors,
} from "./site.test.support.ts";
import { serveSite } from "./site.ts";

beforeEach(() => Effect.runPromise(resetSite));

afterAll(() => Effect.runPromise(closeDatabase));

const ORIGIN = "https://masseater.dev";

const ARTICLE = "/api/stars/blogs/hello";

const IP = "192.0.2.1";

const OTHER_IP = "198.51.100.7";

const THIRD_IP = "203.0.113.9";

const IPV6 = "2001:db8:12:34::1";

const SAME_NETWORK_IPV6 = "2001:db8:12:34:aaaa:bbbb:cccc:dddd";

const OTHER_NETWORK_IPV6 = "2001:db8:12:35::1";

const IPV6_NETWORK = "2001:db8:12:34";

const NOT_FOUND = 404;

const TOO_MANY = 429;

const ONE_ROW = 1;

const SECURITY_TXT = "/.well-known/security.txt";

const VALIDITY = { minimum: 15_552_000_000, maximum: 31_536_000_000 };

const BOTH_SALTS = 2;

const ONE_NONCE = 1;

const NONCE_IN_POLICY = /'nonce-(?<nonce>[^']+)'/gu;

const NONCE_ON_TAG = /<(?:script|style)\b[^>]*\snonce="(?<nonce>[^"]+)"/gu;

const OPENING_TAGS = /<(?:script|style)\b/gu;

const SHA256_HEX = /^[0-9a-f]{64}$/u;

const fetchSite = (request: Request): Effect.Effect<Response> =>
  site.pipe(Effect.flatMap((found) => Effect.promise(() => serveSite(found)(request))));

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

test("同じ /64 の IPv6 から付けた star は 1 つと数える", () =>
  Effect.runPromise(
    Effect.gen(function* starFromOneNetwork() {
      yield* fromIp(ARTICLE, "PUT", IPV6);
      const neighbour = yield* fromIp(ARTICLE, "PUT", SAME_NETWORK_IPV6).pipe(
        Effect.flatMap(jsonOf),
      );
      const other = yield* fromIp(ARTICLE, "PUT", OTHER_NETWORK_IPV6).pipe(Effect.flatMap(jsonOf));
      expect(neighbour).toStrictEqual({ status: "found", count: 1, starred: true });
      expect(other).toStrictEqual({ status: "found", count: 2, starred: true });
    }),
  ));

test("star の書き込みが上限を超えたら 429 で断り、何も書かない", () =>
  Effect.runPromise(
    Effect.gen(function* starWhileFlooded() {
      yield* flood;
      const added = yield* fromIp(ARTICLE, "PUT", IP);
      const removed = yield* fromIp(ARTICLE, "DELETE", IP);
      const visitors = yield* storedVisitors;
      expect(added.status).toBe(TOO_MANY);
      expect(removed.status).toBe(TOO_MANY);
      expect(visitors).toStrictEqual([]);
    }),
  ));

test("書き込みの上限は IPv6 を /64 にまとめて数え、読み取りは数えない", () =>
  Effect.runPromise(
    Effect.gen(function* countWrites() {
      yield* fromIp(ARTICLE, "PUT", IPV6);
      yield* fromIp(ARTICLE, "DELETE", SAME_NETWORK_IPV6);
      yield* fromIp(ARTICLE, "PUT", IP);
      yield* fromIp(ARTICLE, "GET", IP);
      const keys = yield* limitedKeys;
      expect(keys).toStrictEqual([IPV6_NETWORK, IPV6_NETWORK, IP]);
    }),
  ));

test("star を数える問い合わせは star の数だけの行を返さない", () =>
  Effect.runPromise(
    Effect.gen(function* countInSql() {
      yield* Effect.forEach([IP, OTHER_IP, THIRD_IP], (ip) => fromIp(ARTICLE, "PUT", ip), {
        concurrency: 1,
      });
      yield* forgetReturnedRows;
      const seen = yield* fromIp(ARTICLE, "GET", IP).pipe(Effect.flatMap(jsonOf));
      const rows = yield* returnedRows;
      expect(seen).toStrictEqual({ status: "found", count: 3, starred: true });
      expect(rows).toStrictEqual([ONE_ROW]);
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

const expiresIn = (lines: readonly string[], now: number): Option.Option<number> =>
  pipe(
    lines,
    Arr.findFirst(Str.startsWith("Expires: ")),
    Option.map(Str.replace("Expires: ", "")),
    Option.map((value) => Date.parse(value) - now),
  );

test("security.txt は報告先と 1 年以内の期限を返す", () =>
  Effect.runPromise(
    Effect.gen(function* fetchSecurityTxt() {
      const now = yield* Clock.currentTimeMillis;
      const response = yield* fetchSite(new Request(`${ORIGIN}${SECURITY_TXT}`));
      const lines = yield* textOf(response).pipe(Effect.map(Str.split("\n")));
      const forwarded = yield* lastAssetRequest;
      expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
      expect(lines).toStrictEqual([
        "Contact: https://github.com/masseater/masseater.dev/security/advisories/new",
        expect.stringMatching(/^Expires: \d{4}-\d{2}-\d{2}T[\d:.]+Z$/u),
        "Preferred-Languages: ja, en",
        `Canonical: ${ORIGIN}${SECURITY_TXT}`,
        "",
      ]);
      expect(Option.exists(expiresIn(lines, now), Num.between(VALIDITY))).toBe(true);
      expect(forwarded).toStrictEqual(Option.none());
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
