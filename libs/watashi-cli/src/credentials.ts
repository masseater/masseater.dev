import { Clock, Effect, FileSystem, Option, Path, Redacted, Result, Schema } from "effect";
import type { PlatformError } from "effect";

import type { JsonError } from "./errors.ts";
import { postForm } from "./http-json.ts";
import type { HttpServices as Services } from "./services.ts";

const CredentialsShape = Schema.Struct({
  tokenEndpoint: Schema.String,
  clientId: Schema.String,
  resource: Schema.String,
  accessToken: Schema.String,
  refreshToken: Schema.optionalKey(Schema.String),
  expiresAt: Schema.Finite,
});

type OAuthCredentials = typeof CredentialsShape.Type;

const CredentialsFile = Schema.fromJsonString(CredentialsShape);

const decodeCredentials = Schema.decodeUnknownOption(CredentialsFile);

const encodeCredentials = Schema.encodeEffect(CredentialsFile);

const TokenShape = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.optionalKey(Schema.String),
  expires_in: Schema.optionalKey(Schema.Finite),
});

type TokenResponse = typeof TokenShape.Type;

type CredentialsError = JsonError | PlatformError.PlatformError;

const REFRESH_MARGIN_MILLIS = 60_000;
const DEFAULT_EXPIRES_IN_SECONDS = 3600;
const MILLIS_PER_SECOND = 1000;
const OWNER_ONLY = 0o600;

const credentialsPath = (home: string): Effect.Effect<string, never, Path.Path> =>
  Effect.service(Path.Path).pipe(Effect.map((path) => path.join(home, "oauth.json")));

const loadCredentials = (
  home: string,
): Effect.Effect<Option.Option<OAuthCredentials>, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* load() {
    const fs = yield* FileSystem.FileSystem;
    const file = yield* credentialsPath(home);
    const text = yield* Effect.option(fs.readFileString(file));
    return text.pipe(Option.flatMap(decodeCredentials));
  });

const saveCredentials = (
  saved: Readonly<{ home: string; credentials: OAuthCredentials }>,
): Effect.Effect<void, CredentialsError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* save() {
    const fs = yield* FileSystem.FileSystem;
    const file = yield* credentialsPath(saved.home);
    yield* fs.makeDirectory(saved.home, { recursive: true });
    const text = yield* encodeCredentials(saved.credentials);
    yield* fs.writeFileString(file, text, { mode: OWNER_ONLY });
    yield* fs.chmod(file, OWNER_ONLY);
  });

const forgetCredentials = (
  home: string,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* forget() {
    const fs = yield* FileSystem.FileSystem;
    const file = yield* credentialsPath(home);
    yield* fs.remove(file, { force: true });
  });

const expiresInMillisOf = (token: TokenResponse): number =>
  Option.getOrElse(Option.fromNullishOr(token.expires_in), () => DEFAULT_EXPIRES_IN_SECONDS) *
  MILLIS_PER_SECOND;

const credentialsOf = (
  issued: Readonly<{
    base: Pick<OAuthCredentials, "tokenEndpoint" | "clientId" | "resource" | "refreshToken">;
    token: TokenResponse;
    now: number;
  }>,
): OAuthCredentials => {
  const refreshToken = issued.token.refresh_token ?? issued.base.refreshToken;
  return {
    tokenEndpoint: issued.base.tokenEndpoint,
    clientId: issued.base.clientId,
    resource: issued.base.resource,
    accessToken: issued.token.access_token,
    ...Option.match(Option.fromNullishOr(refreshToken), {
      onNone: () => ({}),
      onSome: (value) => ({ refreshToken: value }),
    }),
    expiresAt: issued.now + expiresInMillisOf(issued.token),
  };
};

const isFresh =
  (now: number) =>
  (credentials: OAuthCredentials): boolean =>
    credentials.expiresAt - REFRESH_MARGIN_MILLIS > now;

const accessOf = (credentials: OAuthCredentials): Redacted.Redacted =>
  Redacted.make(credentials.accessToken);

type Refresh = Readonly<{
  home: string;
  credentials: OAuthCredentials;
  refreshToken: string;
  now: number;
}>;

const refreshed = (
  current: Refresh,
): Effect.Effect<Redacted.Redacted, CredentialsError, Services> =>
  postForm({
    schema: TokenShape,
    url: current.credentials.tokenEndpoint,
    form: {
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
      client_id: current.credentials.clientId,
      resource: current.credentials.resource,
    },
  }).pipe(
    Effect.map((token) => credentialsOf({ base: current.credentials, token, now: current.now })),
    Effect.tap((credentials) => saveCredentials({ home: current.home, credentials })),
    Effect.map(accessOf),
  );

const freshAccess =
  (now: number) =>
  (saved: Option.Option<OAuthCredentials>): Option.Option<Redacted.Redacted> =>
    saved.pipe(Option.filter(isFresh(now)), Option.map(accessOf));

const reloaded = (
  current: Refresh,
): Effect.Effect<Option.Option<Redacted.Redacted>, never, FileSystem.FileSystem | Path.Path> =>
  loadCredentials(current.home).pipe(Effect.map(freshAccess(current.now)));

const refresh = (
  current: Refresh,
): Effect.Effect<Option.Option<Redacted.Redacted>, CredentialsError, Services> =>
  Effect.gen(function* refreshAccess() {
    const attempt = yield* Effect.result(refreshed(current));
    if (Result.isSuccess(attempt)) {
      return Option.some(attempt.success);
    }
    const saved = yield* reloaded(current);
    if (Option.isSome(saved)) {
      return saved;
    }
    return yield* attempt.failure;
  });

const renew = (
  home: string,
  credentials: OAuthCredentials,
): Effect.Effect<Option.Option<Redacted.Redacted>, CredentialsError, Services> =>
  Effect.gen(function* renewAccess() {
    const now = yield* Clock.currentTimeMillis;
    if (isFresh(now)(credentials)) {
      return Option.some(accessOf(credentials));
    }
    const refreshToken = Option.fromNullishOr(credentials.refreshToken);
    if (Option.isNone(refreshToken)) {
      return Option.none();
    }
    return yield* refresh({ home, credentials, refreshToken: refreshToken.value, now });
  });

const freshAccessToken = (
  home: string,
): Effect.Effect<Option.Option<Redacted.Redacted>, CredentialsError, Services> =>
  loadCredentials(home).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (credentials) => renew(home, credentials),
      }),
    ),
  );

/** @internal */
export {
  TokenShape,
  credentialsOf,
  forgetCredentials,
  freshAccessToken,
  loadCredentials,
  saveCredentials,
};
/** @internal */
export type { CredentialsError, OAuthCredentials, TokenResponse };
