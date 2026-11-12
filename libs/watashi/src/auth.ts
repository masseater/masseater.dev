import { Effect, Option } from "effect";
import type { Redacted } from "effect";

import { freshAccessToken } from "./credentials.ts";
import type { CredentialsError } from "./credentials.ts";
import { WatashiFailed } from "./errors.ts";
import type { Services } from "./services.ts";
import type { Settings } from "./settings.ts";

const notLoggedIn = WatashiFailed.make({
  reason: "NotLoggedIn",
  message: "ログインしていない。watashi login を実行するか WATASHI_TOKEN を設定する。",
});

const authorization = (
  current: Settings,
): Effect.Effect<Option.Option<Redacted.Redacted>, CredentialsError, Services> =>
  Option.match(current.token, {
    onSome: Effect.succeedSome,
    onNone: () => freshAccessToken(current.home),
  });

const authorized = (
  current: Settings,
): Effect.Effect<Redacted.Redacted, CredentialsError | WatashiFailed, Services> =>
  authorization(current).pipe(
    Effect.flatMap(
      Option.match({ onNone: () => Effect.fail(notLoggedIn), onSome: Effect.succeed }),
    ),
  );

/** @internal */
export { authorization, authorized };
