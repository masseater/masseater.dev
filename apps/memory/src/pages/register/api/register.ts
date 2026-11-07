import { run } from "@r_masseater/workers-tracing/effect";
import { Effect, String as Str } from "effect";

import { authClient, requireAuthSuccess } from "#/shared/auth";

const FRAGMENT_MARK = "#";

const inviteFromLocation = (): string => Str.replace(FRAGMENT_MARK, "")(globalThis.location.hash);

const registerPasskey = (): Promise<unknown> =>
  run(
    Effect.promise(() =>
      authClient.passkey.addPasskey({ context: inviteFromLocation(), createSession: true }),
    ).pipe(Effect.flatMap(requireAuthSuccess)),
  );

export { registerPasskey };
