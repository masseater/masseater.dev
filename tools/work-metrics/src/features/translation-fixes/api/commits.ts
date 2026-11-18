import { listCommits } from "@distilled.cloud/github/pulls";
import { compareCommits, getCommit, getContent } from "@distilled.cloud/github/repos";
import {
  Array as Arr,
  Effect,
  Number as Num,
  Option,
  Schema,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { Base64 } from "effect/encoding";

import { fixesOf } from "#/features/translation-fixes/model/fixes.ts";
import type { FileChange } from "#/features/translation-fixes/model/fixes.ts";
import { pairsOf } from "#/features/translation-fixes/model/pairs.ts";
import type { Commit, Pair } from "#/features/translation-fixes/model/pairs.ts";
import { PAGE_SIZE, mergedPulls } from "#/shared/api/pulls.ts";
import type { Repository } from "#/shared/api/pulls.ts";

const MERGE_PARENTS = 2;
const NONE = 0;
const PARALLEL = 4;

type Changed = Readonly<{
  filename: string;
  additions?: number | undefined;
  deletions?: number | undefined;
  patch?: string | undefined;
}>;

const WHITESPACE = /\s/gu;

const Content = Schema.Struct({ content: Schema.String });

const linesAt = Effect.fn("translationFixes.lines")(function* linesAt(
  repository: Repository,
  ref: string,
  path: string,
) {
  const found = yield* getContent({ ...repository, path, ref });
  return pipe(
    Schema.decodeUnknownOption(Content)(found),
    Option.map(({ content }) => pipe(content, Str.replaceAll(WHITESPACE, ""))),
    Option.flatMap((encoded) => Option.getSuccess(Base64.decodeString(encoded))),
    Option.match({ onNone: () => NONE, onSome: (text) => Str.split(text, "\n").length }),
  );
});

const changeOf = (file: Changed): FileChange => ({
  filename: file.filename,
  additions: file.additions ?? NONE,
  deletions: file.deletions ?? NONE,
  patch: file.patch ?? "",
});

const commitsOf = Effect.fn("translationFixes.commits")(function* commitsOf(
  repository: Repository,
  number: number,
) {
  const commits = yield* Stream.runCollect(
    listCommits.items({ ...repository, pull_number: number, per_page: PAGE_SIZE }),
  );
  return pipe(
    Arr.fromIterable(commits),
    Arr.map((commit): Commit => ({
      sha: commit.sha,
      subject: Arr.headNonEmpty(Str.split(commit.commit.message, "\n")),
      merge: commit.parents.length >= MERGE_PARENTS,
    })),
  );
});

const pairFixes = Effect.fn("translationFixes.pair")(function* pairFixes(
  repository: Repository,
  pull: Readonly<{ number: number }>,
  pair: Pair,
) {
  const raw = yield* getCommit({ ...repository, ref: pair.raw });
  const fix = yield* compareCommits({ ...repository, basehead: `${pair.raw}...${pair.fix}` });
  const files = pipe(
    raw.files ?? [],
    Arr.map((file) => file.filename),
  );
  const lines = yield* Effect.forEach(files, (path) => linesAt(repository, pair.raw, path), {
    concurrency: 1,
  });
  return fixesOf({ repository: `${repository.owner}/${repository.repo}`, number: pull.number })({
    files,
    translatedLines: Num.sumAll(lines),
    fix: pipe(fix.files ?? [], Arr.map(changeOf)),
  });
});

const pullFixes = Effect.fn("translationFixes.pull")(function* pullFixes(
  repository: Repository,
  pull: Readonly<{ number: number }>,
) {
  const commits = yield* commitsOf(repository, pull.number);
  return yield* Effect.forEach(pairsOf(commits), (pair) => pairFixes(repository, pull, pair), {
    concurrency: 1,
  });
});

const fixesSince = Effect.fn("translationFixes.since")(function* fixesSince(
  repository: Repository,
  since: number,
) {
  const pulls = yield* mergedPulls(repository, since);
  const found = yield* Effect.forEach(pulls, (pull) => pullFixes(repository, pull), {
    concurrency: PARALLEL,
  });
  return Arr.flatten(found);
});

/** @internal */
export const translationFixes = fixesSince;
