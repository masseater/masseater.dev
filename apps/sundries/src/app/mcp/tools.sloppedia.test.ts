import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { afterAll, beforeAll, beforeEach } from "vite-plus/test";

import { registerSloppediaTools } from "#/features/edit-sloppedia/index.ts";

import {
  broker,
  callTool,
  MAIN_SHA,
  NEW_PULL,
  REPO,
  sentRequests,
  setScene,
  github,
} from "./tools.test.support.ts";
import type { Sent } from "./tools.test.support.ts";

beforeAll(() => {
  github.listen({ onUnhandledFrame: "error" });
});
beforeEach(() => {
  setScene({});
});

afterAll(() => {
  github.close();
});

const BRANCH = "sloppedia/web-dev";

const OPEN_PULL = 7;

const UNAUTHORIZED = 401;

const CONFLICT = 409;

const OK = 200;

const ONCE = 1;

const ARTICLE = {
  slug: "web-dev",
  title: "Web 開発",
  description: "Web の開発である。",
  body: "Web 開発は、Web の開発である。\n",
};

const writeArticle = callTool({
  register: registerSloppediaTools({ SLOPPEDIA_GITHUB: broker }),
  name: "write_sloppedia_article",
  arguments: ARTICLE,
});

const sentTo = (method: string, path: string): readonly Sent[] =>
  pipe(
    sentRequests(),
    Arr.filter((request) => request.method === method && request.path === path),
  );

it.effect("新しい記事はブランチと PR を作り、auto-merge を有効にする", () =>
  Effect.gen(function* newArticle() {
    const { isError, text } = yield* writeArticle;
    expect(isError).toBe(false);
    expect(text).toContain(`/pull/${String(NEW_PULL)}`);
    expect(sentTo("POST", `${REPO}/git/refs`)).toStrictEqual([
      {
        method: "POST",
        path: `${REPO}/git/refs`,
        body: { ref: `refs/heads/${BRANCH}`, sha: MAIN_SHA },
      },
    ]);
    expect(sentTo("POST", "/graphql")).toHaveLength(ONCE);
  }),
);

it.effect("auto-merge の HTTP が失敗したら成功と返さず、失敗した手順を返す", () =>
  Effect.gen(function* autoMergeRejected() {
    setScene({ graphql: { status: UNAUTHORIZED, body: { message: "Bad credentials" } } });
    const { isError, text } = yield* writeArticle;
    expect(isError).toBe(true);
    expect(text).toContain("enable auto-merge");
  }),
);

it.effect("GraphQL が auto-merge を断ったら、PR をそのままマージする", () =>
  Effect.gen(function* autoMergeRefused() {
    setScene({
      graphql: { status: OK, body: { errors: [{ message: "Pull request is in clean status" }] } },
    });
    const { isError } = yield* writeArticle;
    expect(isError).toBe(false);
    expect(sentTo("PUT", `${REPO}/pulls/${String(NEW_PULL)}/merge`)).toHaveLength(ONCE);
  }),
);

it.effect(
  "同じ slug のブランチと PR が残っていたら、ブランチを main に合わせ直して PR を使い回す",
  () =>
    Effect.gen(function* branchLeftOver() {
      setScene({ branches: [BRANCH], openPulls: { [BRANCH]: OPEN_PULL } });
      const { isError, text } = yield* writeArticle;
      expect(isError).toBe(false);
      expect(text).toContain(`/pull/${String(OPEN_PULL)}`);
      expect(sentTo("PATCH", `${REPO}/git/refs/heads/${BRANCH}`)).toStrictEqual([
        {
          method: "PATCH",
          path: `${REPO}/git/refs/heads/${BRANCH}`,
          body: { sha: MAIN_SHA, force: true },
        },
      ]);
      expect(sentTo("POST", `${REPO}/pulls`)).toStrictEqual([]);
    }),
);

it.effect("記事の書き込みが失敗したら、失敗した手順を返す", () =>
  Effect.gen(function* commitRejected() {
    setScene({ commit: { status: CONFLICT, body: { message: "sha does not match" } } });
    const { isError, text } = yield* writeArticle;
    expect(isError).toBe(true);
    expect(pipe(text, Str.includes("commit file"))).toBe(true);
    expect(sentTo("POST", `${REPO}/pulls`)).toStrictEqual([]);
  }),
);
