import { TOKEN_SCOPES } from "@masseater.dev/watashi-protocol";
import { Array as Arr, Console, Effect } from "effect";
import type { Config } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { asWatashi, issueToken, listTokens, revokeToken } from "./api.ts";
import { authorized } from "./auth.ts";
import type { CredentialsError } from "./credentials.ts";
import type { WatashiFailed } from "./errors.ts";
import type { Services } from "./services.ts";
import { settings } from "./settings.ts";

const withWatashi = <Value, Failure, Requirement>(
  effect: Effect.Effect<Value, Failure, Requirement>,
): Effect.Effect<
  Value,
  Failure | CredentialsError | WatashiFailed | Config.ConfigError,
  Requirement | Services
> =>
  Effect.gen(function* run() {
    const current = yield* settings;
    const authorization = yield* authorized(current);
    return yield* asWatashi({ url: current.url, authorization })(effect);
  });

const issueCommand = Command.make(
  "issue",
  {
    scope: Flag.Literals("scope", TOKEN_SCOPES),
    label: Flag.String("label").pipe(Flag.withDefault("")),
  },
  ({ scope, label }) =>
    withWatashi(issueToken({ scope, label })).pipe(
      Effect.tap((issued) => Console.log(issued.token)),
      Effect.flatMap((issued) =>
        Console.error(
          `id: ${issued.id}  scope: ${issued.scope}  label: ${issued.label}\nこの値は二度と表示しない。WATASHI_TOKEN に設定する。`,
        ),
      ),
    ),
).pipe(Command.withDescription("長期のトークンを発行して表示する（WATASHI_TOKEN に入れて使う）"));

const listCommand = Command.make("list", {}, () =>
  withWatashi(listTokens).pipe(
    Effect.map(({ tokens }) => tokens),
    Effect.flatMap(
      Effect.forEach((item) =>
        Console.log(
          Arr.join(
            [item.id, item.scope, item.label, item.createdAt, item.revokedAt ?? "active"],
            "\t",
          ),
        ),
      ),
    ),
  ),
).pipe(Command.withDescription("発行したトークンを一覧する"));

const revokeCommand = Command.make("revoke", { id: Argument.String("id") }, ({ id }) =>
  withWatashi(revokeToken(id)).pipe(
    Effect.flatMap(({ revoked }) => Console.log(`revoked ${revoked}`)),
  ),
).pipe(Command.withDescription("トークンを失効させる"));

const tokenCommand = Command.make("token").pipe(
  Command.withDescription("watashi の API トークンを扱う"),
  Command.withSubcommands([issueCommand, listCommand, revokeCommand]),
);

/** @internal */
export { tokenCommand, withWatashi };
