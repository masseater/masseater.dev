import { Array as Arr, Effect, Exit, Option, Schema, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { fails, randomKey } from "./app-store.test.support.ts";
import { issueKinds, selectKinds } from "./credential-kinds.ts";

type Issued = Readonly<Record<string, unknown>>;

type Issuer = Effect.Effect<Option.Option<Issued>>;

const ALL = ["cloudflare", "github", "npm", "atproto", "shared"];

const CLOUDFLARE = { token: "fake-cloudflare-token", accountId: "fake-account" };
const GITHUB = { githubToken: "fake-github-token" };
const NPM = { npmToken: "fake-npm-token" };
const ATPROTO = { atpAppPassword: `fake-${randomKey()}` };
const SHARED = { openrouterApiKey: "fake-openrouter", claudeCodeOauthToken: "fake-claude" };

const encodeJson = Schema.encodeOption(Schema.fromJsonString(Schema.Unknown));

const selected = (query: string): ReturnType<typeof selectKinds> =>
  selectKinds(new URLSearchParams(query));

const uncalled: Issuer = Effect.die("this issuer must not run");

const EVERY_ISSUER = {
  cloudflare: Effect.succeedSome(CLOUDFLARE),
  github: Effect.succeedSome(GITHUB),
  npm: Effect.succeedSome(NPM),
  atproto: Effect.succeedSome(ATPROTO),
  shared: Effect.succeedSome(SHARED),
};

const NO_ISSUER = {
  cloudflare: uncalled,
  github: uncalled,
  npm: uncalled,
  atproto: uncalled,
  shared: uncalled,
};

const LEGACY_RESPONSE: unknown = Object.assign(
  {},
  ...pipe([CLOUDFLARE, GITHUB, NPM, ATPROTO], Arr.map(Option.some), Arr.getSomes),
  SHARED,
);

test("only が無ければ、今までと同じくすべての種類を選ぶ", () =>
  Effect.runPromise(
    Effect.gen(function* absent() {
      const withoutQuery = yield* selected("");
      const withOtherParameter = yield* selected("other=github");
      expect(withoutQuery).toStrictEqual(ALL);
      expect(withOtherParameter).toStrictEqual(ALL);
    }),
  ));

test.each(ALL)("only=%s は、その種類だけを選ぶ", (kind) =>
  Effect.runPromise(
    Effect.gen(function* single() {
      const kinds = yield* selected(`only=${kind}`);
      expect(kinds).toStrictEqual([kind]);
    }),
  ),
);

test("複数の種類は、書いた順や重複によらず決まった順で選ぶ", () =>
  Effect.runPromise(
    Effect.gen(function* several() {
      const listed = yield* selected("only=shared,github,github");
      const repeated = yield* selected("only=npm&only=cloudflare");
      expect(listed).toStrictEqual(["github", "shared"]);
      expect(repeated).toStrictEqual(["cloudflare", "npm"]);
    }),
  ));

test.each([
  "only=bogus",
  "only=",
  "only=github,bogus",
  "only=github,",
  "only=GitHub",
  "only=%20github",
])("知らない種類を含む %s は断る", (query) =>
  Effect.runPromise(
    Effect.gen(function* unknown() {
      const failed = yield* fails(selected(query));
      expect(failed).toBe(true);
    }),
  ),
);

test("only が無いときの応答は、変更前の組み立てと 1 文字も違わない", () =>
  Effect.runPromise(
    Effect.gen(function* unchanged() {
      const kinds = yield* selected("");
      const issued = yield* issueKinds({ kinds, issuers: EVERY_ISSUER });
      expect(issued).toStrictEqual(LEGACY_RESPONSE);
      expect(encodeJson(issued)).toStrictEqual(encodeJson(LEGACY_RESPONSE));
    }),
  ));

test("only が無いとき、権限の無い種類は今までどおり応答から抜ける", () =>
  Effect.runPromise(
    Effect.gen(function* partlyGranted() {
      const kinds = yield* selected("");
      const issuers = {
        ...EVERY_ISSUER,
        github: Effect.succeedNone,
        npm: Effect.succeedNone,
        atproto: Effect.succeedNone,
      };
      const issued = yield* issueKinds({ kinds, issuers });
      expect(encodeJson(issued)).toStrictEqual(encodeJson({ ...CLOUDFLARE, ...SHARED }));
    }),
  ));

test("only=github は GitHub のトークンだけを返し、ほかの種類の発行を動かさない", () =>
  Effect.runPromise(
    Effect.gen(function* onlyGitHub() {
      const kinds = yield* selected("only=github");
      const issuers = { ...NO_ISSUER, github: EVERY_ISSUER.github };
      const issued = yield* issueKinds({ kinds, issuers });
      expect(issued).toStrictEqual(GITHUB);
    }),
  ));

test("only=atproto は app password だけを返し、ほかの種類の発行を動かさない", () =>
  Effect.runPromise(
    Effect.gen(function* onlyAtproto() {
      const kinds = yield* selected("only=atproto");
      const issuers = { ...NO_ISSUER, atproto: EVERY_ISSUER.atproto };
      const issued = yield* issueKinds({ kinds, issuers });
      expect(issued).toStrictEqual(ATPROTO);
    }),
  ));

test("動かすと落ちる発行は、その種類を選んだときだけ落ちる", () =>
  Effect.runPromise(
    Effect.gen(function* guard() {
      const kinds = yield* selected("only=npm");
      const exit = yield* issueKinds({ kinds, issuers: NO_ISSUER }).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  ));

test("選んだ種類に権限が無ければ、空の応答になる", () =>
  Effect.runPromise(
    Effect.gen(function* notGranted() {
      const kinds = yield* selected("only=npm");
      const issuers = { ...EVERY_ISSUER, npm: Effect.succeedNone };
      const issued = yield* issueKinds({ kinds, issuers });
      expect(issued).toStrictEqual({});
    }),
  ));
