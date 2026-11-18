import { Array as Arr, Clock, Effect } from "effect";

import { repositoryOf } from "#/shared/api/pulls.ts";
import type { Repository } from "#/shared/api/pulls.ts";
import { sinceDays } from "#/shared/lib/output.ts";

/** @internal */
export type Window = Readonly<{ repo: readonly string[]; days: number }>;

/** @internal */
export const acrossRepositories =
  <Found, Failure, Services>(
    collect: (
      repository: Repository,
      since: number,
    ) => Effect.Effect<readonly Found[], Failure, Services>,
  ) =>
  ({ repo, days }: Window): Effect.Effect<readonly Found[], Failure, Services> =>
    Effect.gen(function* across() {
      const now = yield* Clock.currentTimeMillis;
      const since = sinceDays(days)(now);
      const found = yield* Effect.forEach(repo, (name) => collect(repositoryOf(name), since), {
        concurrency: 1,
      });
      return Arr.flatten(found);
    });
