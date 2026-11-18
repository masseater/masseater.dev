import { list } from "@distilled.cloud/github/pulls";
import { Effect, Option, Stream, String as Str, pipe } from "effect";

import { millis } from "#/shared/lib/time.ts";

export type Repository = Readonly<{ owner: string; repo: string }>;

export const PAGE_SIZE = 100;

const mergedSince =
  (since: number) =>
  (pull: Readonly<{ merged_at?: string | null }>): boolean =>
    pipe(
      Option.fromNullishOr(pull.merged_at),
      Option.exists((merged) => millis(merged) >= since),
    );

const listMerged = Effect.fn("github.mergedPulls")(function* listMerged(
  repository: Repository,
  since: number,
) {
  return yield* list
    .items({
      ...repository,
      state: "closed",
      sort: "updated",
      direction: "desc",
      per_page: PAGE_SIZE,
    })
    .pipe(
      Stream.takeWhile((pull) => millis(pull.updated_at) >= since),
      Stream.filter(mergedSince(since)),
      Stream.runCollect,
    );
});

/** @internal */
export const mergedPulls = listMerged;

export const repositoryOf = (fullName: string): Repository => {
  const [owner, repo = ""] = Str.split(fullName, "/");
  return { owner, repo };
};
