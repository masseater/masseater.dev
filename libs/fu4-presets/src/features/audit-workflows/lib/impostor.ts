import { Array as Arr, Effect, Schema, pipe } from "effect";

import type {
  FastPath,
  GitHubClient,
  GitHubEffect,
  RepoRefs,
} from "#/features/audit-workflows/model/github.ts";

type Determination = "impostor" | "genuine" | "unknown";

const taggedError = Schema.TaggedError;

class Found extends taggedError<Found, { readonly brand: unique symbol }>()("Found", {}) {}

const COMPARE_CONCURRENCY = { concurrency: 8 } as const;

const listed =
  (refs: RepoRefs) =>
  (sha: string): boolean =>
    pipe(
      [...refs.tags, ...refs.branches],
      Arr.some((ref) => ref.commit === sha),
    );

const fromFastPath = (found: FastPath): Determination => {
  if (found === "absent") {
    return "impostor";
  }
  if (found === "contained") {
    return "genuine";
  }
  return "unknown";
};

const fastPaths =
  (client: GitHubClient, slug: string, refs: RepoRefs) =>
  (sha: string): GitHubEffect<Determination> => {
    if (listed(refs)(sha)) {
      return Effect.succeed("genuine");
    }
    return Effect.map(client.branchCommits(slug)(sha), fromFastPath);
  };

const stopIf = (found: boolean): Effect.Effect<void, Found> => {
  if (found) {
    return Effect.fail(Found.make({}));
  }
  return Effect.void;
};

const anyContains = (checks: readonly (() => GitHubEffect<boolean>)[]): GitHubEffect<boolean> =>
  Effect.forEach(checks, (each) => Effect.flatMap(each(), stopIf), COMPARE_CONCURRENCY).pipe(
    Effect.as(false),
    Effect.catchTag("Found", () => Effect.succeed(true)),
  );

const slowPath =
  (client: GitHubClient, slug: string, refs: RepoRefs) =>
  (sha: string): GitHubEffect<boolean> => {
    const contains = (base: string) => (): GitHubEffect<boolean> =>
      client.contains(slug)(base, sha);
    return Effect.flatMap(client.defaultBranch(slug), (main) =>
      Effect.flatMap(contains(`refs/heads/${main}`)(), (found) => {
        if (found) {
          return Effect.succeed(true);
        }
        return anyContains([
          ...pipe(
            refs.branches,
            Arr.filter((branch) => branch.name !== main),
            Arr.map((branch) => contains(`refs/heads/${branch.name}`)),
          ),
          ...pipe(
            refs.tags,
            Arr.map((tag) => contains(`refs/tags/${tag.name}`)),
          ),
        ]);
      }),
    );
  };

const peeledFastPath =
  (quick: (sha: string) => GitHubEffect<Determination>, sha: string) =>
  (commit: string): GitHubEffect<Determination> => {
    if (commit === sha) {
      return Effect.succeed("unknown");
    }
    return quick(commit);
  };

const determined = Effect.fn("fu4.zizmor.impostor")(function* determined(
  client: GitHubClient,
  slug: string,
  sha: string,
) {
  const refs = yield* client.refs(slug);
  const quick = fastPaths(client, slug, refs);
  const first = yield* quick(sha);
  if (first !== "unknown") {
    return first === "impostor";
  }
  const commit = yield* client.peeled(slug)(sha);
  const second = yield* peeledFastPath(quick, sha)(commit);
  if (second !== "unknown") {
    return second === "impostor";
  }
  return !(yield* slowPath(client, slug, refs)(commit));
});

const rememberUnless =
  (client: GitHubClient, slug: string, sha: string) =>
  (impostor: boolean): Effect.Effect<void> => {
    if (impostor) {
      return Effect.void;
    }
    return client.reachability.remember(slug)(sha);
  };

export const isImpostor =
  (client: GitHubClient) =>
  (slug: string) =>
  (sha: string): GitHubEffect<boolean> =>
    client.reachability
      .known(slug)(sha)
      .pipe(
        Effect.flatMap((reachable) => {
          if (reachable) {
            return Effect.succeed(false);
          }
          return determined(client, slug, sha).pipe(Effect.tap(rememberUnless(client, slug, sha)));
        }),
      );
