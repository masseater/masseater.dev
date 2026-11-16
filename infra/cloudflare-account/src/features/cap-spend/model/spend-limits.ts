import { CloudflareEnvironment } from "@alchemy.run/cloudflare";
import type { CloudflareOpContext } from "@distilled.cloud/cloudflare";
import {
  createSpendPolicy,
  deleteSpendPolicy,
  listSpendPolicies,
  updateSpendPolicy,
} from "@distilled.cloud/cloudflare/billing";
import type {
  CreateSpendPolicyRequest,
  ListSpendPoliciesError,
  ListSpendPoliciesResultItem,
} from "@distilled.cloud/cloudflare/billing";
import { succeed } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { Array as Arr, Effect, Option, pipe } from "effect";

const SPEND_LIMIT = "MasseaterDev.Cloudflare.SpendLimit";
const BLOCK = "usage_block";
const OVERAGE_CENTS = 1;
const PRODUCTS = ["workers", "durable_objects"] as const;

type Product = (typeof PRODUCTS)[number];

type SpendLimitProps = Readonly<{ product: Product; thresholdCents: number }>;

type SpendLimitOutput = Readonly<{ accountId: string; policyId: string }>;

type PolicyKey = Readonly<{ id: string; productId: string; action: string }>;

type SpendLimitResource = Resource<typeof SPEND_LIMIT, SpendLimitProps, SpendLimitOutput>;

const SpendLimit = Resource<SpendLimitResource>(SPEND_LIMIT);

const accountIdOf = Effect.flatten(CloudflareEnvironment).pipe(
  Effect.map(({ accountId }) => accountId),
);

const policyOf = (
  accountId: string,
  props: SpendLimitProps,
): Omit<CreateSpendPolicyRequest, "notificationEmail"> => ({
  accountId,
  name: `Workers Paid only: block ${props.product} overage`,
  productId: props.product,
  action: BLOCK,
  enabled: true,
  thresholdCents: props.thresholdCents,
});

const existingPolicy = (
  accountId: string,
  matches: (policy: PolicyKey) => boolean,
): Effect.Effect<
  Option.Option<ListSpendPoliciesResultItem>,
  ListSpendPoliciesError,
  CloudflareOpContext
> =>
  listSpendPolicies({ accountId }).pipe(Effect.map((policies) => Arr.findFirst(policies, matches)));

const isTracked = (output: SpendLimitOutput | undefined, policy: PolicyKey): boolean =>
  Option.exists(Option.fromNullishOr(output), ({ policyId }) => policyId === policy.id);

/** @internal */
export const spendLimitProvider = succeed(SpendLimit, {
  reconcile: ({ news, output }) =>
    Effect.gen(function* reconcileSpendLimit() {
      const accountId = yield* accountIdOf;
      const request = policyOf(accountId, news);
      const current = yield* existingPolicy(
        accountId,
        (policy) =>
          isTracked(output, policy) ||
          (policy.productId === news.product && policy.action === BLOCK),
      );
      const saved = yield* Option.match(current, {
        onNone: () => createSpendPolicy(request),
        onSome: ({ id, version }) =>
          updateSpendPolicy({ ...request, policyId: id, ifMatch: String(version) }),
      });
      return { accountId, policyId: saved.id };
    }),
  delete: ({ output }) =>
    existingPolicy(output.accountId, (policy) => policy.id === output.policyId).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.void,
          onSome: ({ id, version }) =>
            deleteSpendPolicy({
              accountId: output.accountId,
              policyId: id,
              ifMatch: String(version),
            }).pipe(Effect.asVoid),
        }),
      ),
    ),
});

export const spendLimits = pipe(
  PRODUCTS,
  Effect.forEach((product) =>
    SpendLimit(`SpendLimit-${product}`, { product, thresholdCents: OVERAGE_CENTS }),
  ),
);
