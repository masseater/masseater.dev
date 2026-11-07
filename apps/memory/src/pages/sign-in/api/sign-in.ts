import { run } from "@r_masseater/workers-tracing/effect";
import { Effect } from "effect";

import { authClient, requireAuthSuccess } from "#/shared/auth";

const signInWithPasskey = (): Promise<unknown> =>
  run(
    Effect.promise(() => authClient.signIn.passkey({ autoFill: false })).pipe(
      Effect.flatMap(requireAuthSuccess),
    ),
  );

export { signInWithPasskey };
