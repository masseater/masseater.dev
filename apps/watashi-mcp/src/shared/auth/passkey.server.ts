import { passkey } from "@better-auth/passkey";
import { run } from "@r_masseater/workers-tracing/effect";
import { APIError } from "better-auth/api";
import { generateRandomString, verifyPassword } from "better-auth/crypto";
import { Effect, Option } from "effect";

import { SITE_NAME, SITE_ORIGIN } from "#/shared/config";

const OWNER_INVITE_HASH =
  "a6f8d888f1b83ee5cdc18e833b7c9b08:f83925e6b19f06c9f373618768edb54ebf76092ef306d518680dc9480ef48ee434b7027c8dcdec48c0ed4ec7154846a0ddddf4289bfeed9728afffb3ab5e675c";

const OWNER_NAME = "masseater";

const PENDING_USER_ID_LENGTH = 32;

const NO_PASSKEYS = 0;

const UNDELIVERABLE_EMAIL_DOMAIN = "passkey.invalid";

const requireOwnerInvite = (
  invite: string | null | undefined,
  countPasskeys: () => Promise<number>,
): Effect.Effect<void, APIError> =>
  Effect.all([
    Effect.promise(() => verifyPassword({ hash: OWNER_INVITE_HASH, password: invite ?? "" })),
    Effect.promise(countPasskeys),
  ]).pipe(
    Effect.filterOrFail(
      ([valid, registered]) => valid && registered === NO_PASSKEYS,
      () => new APIError("FORBIDDEN", { message: "invalid_invite" }),
    ),
    Effect.asVoid,
  );

const pendingOwner = (): { id: string; name: string } => ({
  id: generateRandomString(PENDING_USER_ID_LENGTH),
  name: OWNER_NAME,
});

const undeliverableEmail = (userId: string): string => `${userId}@${UNDELIVERABLE_EMAIL_DOMAIN}`;

const createInvitedOwner = (
  invite: string | null | undefined,
  countPasskeys: () => Promise<number>,
  createUser: () => Promise<{ id: string }>,
): Effect.Effect<{ userId: string }, APIError> =>
  requireOwnerInvite(invite, countPasskeys).pipe(
    Effect.andThen(Effect.promise(createUser)),
    Effect.map(({ id }) => ({ userId: id })),
  );

const ownerPasskey = passkey({
  rpName: SITE_NAME,
  origin: SITE_ORIGIN,
  registration: {
    requireSession: false,
    resolveUser: ({ ctx, context }) =>
      run(
        requireOwnerInvite(context, () => ctx.context.adapter.count({ model: "passkey" })).pipe(
          Effect.map(pendingOwner),
        ),
      ),
    afterVerification: ({ ctx, user, context }) =>
      run(
        Effect.promise(() => ctx.context.internalAdapter.findUserById(user.id)).pipe(
          Effect.flatMap((existing) =>
            Option.match(Option.fromNullishOr(existing), {
              onNone: () =>
                createInvitedOwner(
                  context,
                  () => ctx.context.adapter.count({ model: "passkey" }),
                  () =>
                    ctx.context.internalAdapter.createUser(
                      { name: OWNER_NAME, email: undeliverableEmail(user.id) },
                      { method: "passkey" },
                    ),
                ),
              onSome: () => Effect.succeed({}),
            }),
          ),
        ),
      ),
  },
});

export { ownerPasskey };
