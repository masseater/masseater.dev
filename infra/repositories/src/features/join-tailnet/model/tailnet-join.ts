import { Clock, DateTime, Effect, Schema } from "effect";
import type { Cause } from "effect";
import { SignJWT } from "jose";

import {
  JWT_ALGORITHM,
  oidcSigner,
  publicJwk,
  sshCaKey,
} from "#/features/join-tailnet/api/tailnet.ts";
import type { AppStoreEnv } from "#/shared/api/index.ts";
import { AGENT_SUBJECT, AGENT_TAG, SSH_USER, TAILNET_ISSUER } from "#/shared/config/index.ts";
import type { SealFailed } from "#/shared/lib/sealed-value.ts";
import { signCertificate } from "#/shared/lib/ssh-certificate.ts";
import type { SshCertificateFailed } from "#/shared/lib/ssh-certificate.ts";

import type { Federation } from "./tailnet-federation.ts";

const ID_TOKEN_LIFETIME = "5m";
const CERTIFICATE_LIFETIME_SECONDS = 3600;
const MS_PER_SECOND = 1000;
const NODE_OPTIONS = "ephemeral=true&preauthorized=true";

export type TailnetEnv = AppStoreEnv & Readonly<Partial<Federation>>;

const federation = (env: TailnetEnv): Effect.Effect<Federation, Cause.NoSuchElementError> =>
  Effect.all({
    TAILNET_CLIENT_ID: Effect.fromNullishOr(env.TAILNET_CLIENT_ID),
    TAILNET_AUDIENCE: Effect.fromNullishOr(env.TAILNET_AUDIENCE),
  }).pipe(Effect.tapError(() => Effect.logError("tailnet.not_configured")));

const Joined = Schema.Struct({
  clientId: Schema.String,
  idToken: Schema.String,
  tags: Schema.Array(Schema.String),
  sshUser: Schema.String,
  sshCertificate: Schema.String,
  expiresAt: Schema.String,
});

export type JoinedTailnet = typeof Joined.Type;

const idToken = (env: TailnetEnv, audience: string): Effect.Effect<string, SealFailed> =>
  Effect.gen(function* sign() {
    const signer = yield* oidcSigner(env);
    const { kid = "" } = yield* publicJwk(signer);
    return yield* Effect.promise(() =>
      new SignJWT({})
        .setProtectedHeader({ alg: JWT_ALGORITHM, kid, typ: "JWT" })
        .setIssuer(TAILNET_ISSUER)
        .setSubject(AGENT_SUBJECT)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime(ID_TOKEN_LIFETIME)
        .sign(signer.privateKey),
    );
  });

export const joinTailnet =
  (publicKey: unknown) =>
  (
    env: TailnetEnv,
  ): Effect.Effect<
    JoinedTailnet,
    Schema.SchemaError | SealFailed | SshCertificateFailed | Cause.NoSuchElementError
  > =>
    Effect.gen(function* join() {
      const trust = yield* federation(env);
      const userKey = yield* Schema.decodeUnknownEffect(Schema.String)(publicKey);
      const issuedAt = yield* Clock.currentTimeMillis;
      const ca = yield* sshCaKey(env);
      const sshCertificate = yield* signCertificate({
        ca,
        publicKey: userKey,
        keyId: AGENT_SUBJECT,
        principals: [SSH_USER],
        issuedAt,
        lifetimeSeconds: CERTIFICATE_LIFETIME_SECONDS,
      });
      const token = yield* idToken(env, trust.TAILNET_AUDIENCE);
      yield* Effect.logInfo("tailnet.joined");
      return {
        clientId: `${trust.TAILNET_CLIENT_ID}?${NODE_OPTIONS}`,
        idToken: token,
        tags: [AGENT_TAG],
        sshUser: SSH_USER,
        sshCertificate,
        expiresAt: DateTime.formatIso(
          DateTime.makeUnsafe(issuedAt + CERTIFICATE_LIFETIME_SECONDS * MS_PER_SECOND),
        ),
      };
    });
