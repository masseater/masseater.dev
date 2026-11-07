import { passkey } from "@better-auth/passkey";
import { run } from "@r_masseater/workers-tracing/effect";
import { APIError } from "better-auth/api";
import { generateRandomString, verifyPassword } from "better-auth/crypto";
import { Effect, Option } from "effect";

interface OwnerPasskeyConfig {
  readonly inviteHash: string;
  readonly ownerName: string;
  readonly rpName: string;
  readonly origin: string;
}

const PENDING_USER_ID_LENGTH = 32;

const NO_PASSKEYS = 0;

const UNDELIVERABLE_EMAIL_DOMAIN = "passkey.invalid";

const requireOwnerInvite = (
  inviteHash: string,
  invite: string | null | undefined,
  countPasskeys: () => Promise<number>,
): Effect.Effect<void, APIError> =>
  Effect.all([
    Effect.promise(() => verifyPassword({ hash: inviteHash, password: invite ?? "" })),
    Effect.promise(countPasskeys),
  ]).pipe(
    Effect.filterOrFail(
      ([valid, registered]) => valid && registered === NO_PASSKEYS,
      () => new APIError("FORBIDDEN", { message: "invalid_invite" }),
    ),
    Effect.asVoid,
  );

const undeliverableEmail = (userId: string): string => `${userId}@${UNDELIVERABLE_EMAIL_DOMAIN}`;

const ownerPasskey = ({
  inviteHash,
  ownerName,
  rpName,
  origin,
}: OwnerPasskeyConfig): ReturnType<typeof passkey> =>
  passkey({
    rpName,
    origin,
    registration: {
      requireSession: false,
      resolveUser: ({ ctx, context }) =>
        run(
          requireOwnerInvite(inviteHash, context, () =>
            ctx.context.adapter.count({ model: "passkey" }),
          ).pipe(
            Effect.map(() => ({
              id: generateRandomString(PENDING_USER_ID_LENGTH),
              name: ownerName,
            })),
          ),
        ),
      afterVerification: ({ ctx, user, context }) =>
        run(
          Effect.promise(() => ctx.context.internalAdapter.findUserById(user.id)).pipe(
            Effect.flatMap((existing) =>
              Option.match(Option.fromNullishOr(existing), {
                onNone: () =>
                  requireOwnerInvite(inviteHash, context, () =>
                    ctx.context.adapter.count({ model: "passkey" }),
                  ).pipe(
                    Effect.andThen(
                      Effect.promise(() =>
                        ctx.context.internalAdapter.createUser(
                          { name: ownerName, email: undeliverableEmail(user.id) },
                          { method: "passkey" },
                        ),
                      ),
                    ),
                    Effect.map(({ id }) => ({ userId: id })),
                  ),
                onSome: () => Effect.succeed({}),
              }),
            ),
          ),
        ),
    },
  });

export { ownerPasskey };
export type { OwnerPasskeyConfig };
