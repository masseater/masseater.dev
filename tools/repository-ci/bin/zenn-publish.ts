#!/usr/bin/env node
import { mustSucceed, outputOf, succeeds } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Config, Effect, Option, Redacted } from "effect";
import { Base64 } from "effect/encoding";

const ARTICLES = "apps/zenn-articles";
const BRANCH = "zenn";
const BOT = "github-actions[bot]";
const BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";
const IDENTITY = {
  GIT_AUTHOR_NAME: BOT,
  GIT_AUTHOR_EMAIL: BOT_EMAIL,
  GIT_COMMITTER_NAME: BOT,
  GIT_COMMITTER_EMAIL: BOT_EMAIL,
};

const authenticated = Effect.gen(function* authenticated() {
  const token = yield* Config.Redacted("GITHUB_TOKEN");
  const credentials = Base64.encode(`x-access-token:${Redacted.value(token)}`);
  return {
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${credentials}`,
  };
});

const git = (...args: readonly string[]): { command: string; args: readonly string[] } => ({
  command: "git",
  args,
});

const publishedTree = Effect.fn("publishedTree")(function* publishedTree(
  env: Readonly<Record<string, string>>,
) {
  const fetched = yield* succeeds({
    ...git("fetch", "--no-tags", "--depth=1", "origin", BRANCH),
    env,
  });
  if (!fetched) {
    return Option.none<string>();
  }
  const tree = yield* outputOf(git("rev-parse", "FETCH_HEAD^{tree}"));
  return Option.some(tree);
});

const zennPublish = Effect.gen(function* zennPublish() {
  const sha = yield* Config.String("GITHUB_SHA");
  const env = yield* authenticated;
  const tree = yield* outputOf(git("rev-parse", `HEAD:${ARTICLES}`));
  const published = yield* publishedTree(env);
  if (Option.exists(published, (current) => current === tree)) {
    return;
  }
  const parent = Option.match(published, {
    onNone: (): readonly string[] => [],
    onSome: () => ["-p", "FETCH_HEAD"],
  });
  const commit = yield* outputOf({
    ...git("commit-tree", tree, ...parent, "-m", `deploy: ${sha}`),
    env: IDENTITY,
  });
  yield* mustSucceed({ ...git("push", "origin", `${commit}:refs/heads/${BRANCH}`), env });
});

runMain("zenn-publish")(zennPublish);
