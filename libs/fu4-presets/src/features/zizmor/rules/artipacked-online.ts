import { Array as Arr, Effect, Option, pipe } from "effect";

import { longestTag } from "#/features/zizmor/lib/github-refs.ts";
import { isCommitRef, usesRef } from "#/features/zizmor/lib/uses.ts";
import type { AuditContext } from "#/features/zizmor/model/audit.ts";
import type { GitHubClient } from "#/features/zizmor/model/github.ts";

import { isModernTag } from "./artipacked-steps.ts";
import type { Checkout } from "./artipacked-steps.ts";

const UNBOUNDED = { concurrency: "unbounded" } as const;

const isUnresolved = (checkout: Checkout): boolean =>
  Option.isNone(checkout.modern) && isCommitRef(checkout.uses.gitRef);

const resolved =
  (client: GitHubClient) =>
  (checkout: Checkout): Effect.Effect<Checkout> => {
    if (!isUnresolved(checkout)) {
      return Effect.succeed(checkout);
    }
    return longestTag(client)(usesRef(checkout.uses))(checkout.uses.gitRef).pipe(
      Effect.map((tag): Checkout => ({
        step: checkout.step,
        uses: checkout.uses,
        persona: checkout.persona,
        modern: pipe(
          tag,
          Option.flatMap((found) => isModernTag(found.name)),
        ),
      })),
      Effect.orElseSucceed(() => checkout),
    );
  };

export const resolving =
  (context: AuditContext) =>
  (checkouts: readonly Checkout[]): Option.Option<Effect.Effect<readonly Checkout[]>> => {
    if (!pipe(checkouts, Arr.some(isUnresolved))) {
      return Option.none();
    }
    return pipe(
      context.github,
      Option.map((client) => Effect.forEach(checkouts, resolved(client), UNBOUNDED)),
    );
  };
