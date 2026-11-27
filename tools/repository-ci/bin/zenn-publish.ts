#!/usr/bin/env node
import { getJson, outputOf, patch, post, postJson } from "@r_masseater/github-workflow";
import { runMain } from "@r_masseater/node-main";
import { Array as Arr, Config, Effect, Option, Schema } from "effect";

const ARTICLES = "apps/zenn-articles";
const BRANCH = "zenn";
const REF = `refs/heads/${BRANCH}`;
const BOT = {
  name: "github-actions[bot]",
  email: "41898282+github-actions[bot]@users.noreply.github.com",
};

const Pointer = Schema.Struct({ sha: Schema.String });
const Refs = Schema.Array(Schema.Struct({ ref: Schema.String, object: Pointer }));
const Commit = Schema.Struct({ tree: Pointer });

const publishedHead = getJson(Refs)(`git/matching-refs/heads/${BRANCH}`).pipe(
  Effect.map(Arr.findFirst((found) => found.ref === REF)),
  Effect.map(Option.map((found) => found.object.sha)),
);

const publishedTree = Effect.fn("publishedTree")(function* publishedTree(
  head: Option.Option<string>,
) {
  if (Option.isNone(head)) {
    return Option.none<string>();
  }
  const commit = yield* getJson(Commit)(`git/commits/${head.value}`);
  return Option.some(commit.tree.sha);
});

const zennPublish = Effect.gen(function* zennPublish() {
  const sha = yield* Config.String("GITHUB_SHA");
  const tree = yield* outputOf({ command: "git", args: ["rev-parse", `HEAD:${ARTICLES}`] });
  const head = yield* publishedHead;
  const published = yield* publishedTree(head);
  if (Option.exists(published, (current) => current === tree)) {
    return;
  }
  const commit = yield* postJson(Pointer)({
    path: "git/commits",
    body: {
      message: `deploy: ${sha}`,
      tree,
      parents: Arr.fromOption(head),
      author: BOT,
      committer: BOT,
    },
  });
  yield* Option.match(head, {
    onNone: () => post({ path: "git/refs", body: { ref: REF, sha: commit.sha } }),
    onSome: () => patch({ path: `git/${REF}`, body: { sha: commit.sha, force: false } }),
  });
});

runMain("zenn-publish")(zennPublish);
