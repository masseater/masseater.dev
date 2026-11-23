import { Array as Arr, Effect, Option, pipe } from "effect";

import { longestTag } from "#/features/audit-workflows/lib/github-refs.ts";
import { COMMIT, usesRef } from "#/features/audit-workflows/lib/uses.ts";
import type { AuditContext } from "#/features/audit-workflows/model/audit.ts";
import type { GitHubClient } from "#/features/audit-workflows/model/github.ts";

import { isModernTag } from "./artipacked-steps.ts";
import type { Checkout } from "./artipacked-steps.ts";

const UNBOUNDED = { concurrency: "unbounded" } as const;

const isUnresolved = (checkout: Checkout): boolean =>
  Option.isNone(checkout.modern) && COMMIT.test(checkout.uses.gitRef);

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
