import { listReposAccessibleToInstallation } from "@distilled.cloud/github/apps";
import { Array as Arr, Effect, Stream, pipe } from "effect";

import type { Repository } from "#/entities/exposure/index.ts";

/** @internal */
export const repositories = Stream.runCollect(listReposAccessibleToInstallation.items({})).pipe(
  Effect.map((items) =>
    pipe(
      Arr.fromIterable(items),
      Arr.map((repository): Repository => ({
        id: String(repository.id),
        name: repository.full_name,
        private: repository.private,
      })),
    ),
  ),
  Effect.withSpan("exposure.github"),
);
