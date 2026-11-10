import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { hashPassword } from "better-auth/crypto";
import { Effect } from "effect";
import { expect, test } from "vite-plus/test";

import { ownerPasskey } from "./passkey.server";

type Passkey = Readonly<{ id: string; userId: string; credentialID: string }>;

type Attempt = Readonly<{
  query: Readonly<{ context?: string }>;
  passkeys: readonly Passkey[];
}>;

const INVITE = "correct-invite";

const OWNER_NAME = "owner";

const ORIGIN = "https://owner.example";

const REGISTERED_PASSKEY: Passkey = {
  id: "passkey-1",
  userId: "user-1",
  credentialID: "credential-1",
};

const REJECTED = { status: "FORBIDDEN", body: { message: "invalid_invite" } };

const optionsWith =
  ({ query, passkeys }: Attempt) =>
  (inviteHash: string): Promise<unknown> =>
    betterAuth({
      baseURL: ORIGIN,
      database: memoryAdapter({
        user: [],
        session: [],
        account: [],
        verification: [],
        passkey: [...passkeys],
      }),
      plugins: [
        ownerPasskey({ inviteHash, ownerName: OWNER_NAME, rpName: "Owner", origin: ORIGIN }),
      ],
    }).api.generatePasskeyRegistrationOptions({ query: { ...query } });

const registrationOptions = (attempt: Attempt): Promise<unknown> =>
  Effect.runPromise(
    Effect.promise(() => hashPassword(INVITE)).pipe(
      Effect.flatMap((inviteHash) => Effect.promise(() => optionsWith(attempt)(inviteHash))),
    ),
  );

test("正しい招待で、パスキーがまだ無ければ持ち主として登録を始められる", () =>
  expect(registrationOptions({ query: { context: INVITE }, passkeys: [] })).resolves.toMatchObject({
    user: { name: OWNER_NAME },
  }));

test("正しい招待でも、パスキーが 1 つ登録済みなら拒む", () =>
  expect(
    registrationOptions({ query: { context: INVITE }, passkeys: [REGISTERED_PASSKEY] }),
  ).rejects.toMatchObject(REJECTED));

test("招待が違えば、パスキーがまだ無くても拒む", () =>
  expect(
    registrationOptions({ query: { context: "wrong-invite" }, passkeys: [] }),
  ).rejects.toMatchObject(REJECTED));

test("招待が無ければ拒む", () =>
  expect(registrationOptions({ query: {}, passkeys: [] })).rejects.toMatchObject(REJECTED));
