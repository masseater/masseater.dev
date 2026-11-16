import { run } from "@r_masseater/workers-tracing/effect";
import { Effect, String as Str } from "effect";

import { authClient } from "#/shared/api/index.ts";
import { requireAuthSuccess } from "#/shared/lib/result.ts";

const FRAGMENT_MARK = "#";

const inviteFromLocation = (): string => Str.replace(FRAGMENT_MARK, "")(globalThis.location.hash);

export const registerPasskey = (): Promise<unknown> =>
  run(
    Effect.promise(() =>
      authClient.passkey.addPasskey({ context: inviteFromLocation(), createSession: true }),
    ).pipe(Effect.flatMap(requireAuthSuccess)),
  );

export const signInWithPasskey = (): Promise<unknown> =>
  run(
    Effect.promise(() => authClient.signIn.passkey({ autoFill: false })).pipe(
      Effect.flatMap(requireAuthSuccess),
    ),
  );
