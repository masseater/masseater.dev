import { Command } from "@effect/ui";
import { Effect } from "effect";

import { registerPasskey, signInWithPasskey } from "#/features/sign-in-passkey/model/flows.ts";

import { PasskeyKind, PasskeyPanelMessage } from "./passkey-panel-message.ts";

const FLOWS = { register: registerPasskey, "sign-in": signInWithPasskey } as const;

/** @stability experimental */
export class StartPasskey extends Command.Service<StartPasskey>()("sign-in-passkey/StartPasskey", {
  args: { kind: PasskeyKind },
  success: PasskeyPanelMessage,
}) {
  public static readonly layer = this.toLayer(
    Effect.succeed(({ kind }) =>
      Effect.tryPromise({ try: () => FLOWS[kind](), catch: () => "failed" as const }).pipe(
        Effect.match({
          onSuccess: () => PasskeyPanelMessage.SucceededStartPasskey(),
          onFailure: () => PasskeyPanelMessage.FailedStartPasskey(),
        }),
      ),
    ),
  );
}
