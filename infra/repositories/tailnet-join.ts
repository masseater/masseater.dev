import { Clock, DateTime, Effect, Schema } from "effect";
import { SignJWT } from "jose";

import type { AppStoreEnv } from "./app-store.ts";
import type { SealFailed } from "./sealed-value.ts";
import { signCertificate } from "./ssh-certificate.ts";
import type { SshCertificateFailed } from "./ssh-certificate.ts";
import { AGENT_SUBJECT, AGENT_TAG, SSH_USER, TAILNET_ISSUER } from "./tailnet-names.ts";
import { JWT_ALGORITHM, oidcSigner, publicJwk, sshCaKey } from "./tailnet.ts";

const ID_TOKEN_LIFETIME = "5m";
const CERTIFICATE_LIFETIME_SECONDS = 3600;
const MS_PER_SECOND = 1000;
const NODE_OPTIONS = "ephemeral=true&preauthorized=true";

type TailnetEnv = AppStoreEnv &
  Readonly<{
    TAILNET_CLIENT_ID: string;
    TAILNET_AUDIENCE: string;
  }>;

const Joined = Schema.Struct({
  clientId: Schema.String,
  idToken: Schema.String,
  tags: Schema.Array(Schema.String),
  sshUser: Schema.String,
  sshCertificate: Schema.String,
  expiresAt: Schema.String,
});

type JoinedTailnet = typeof Joined.Type;

const idToken = (env: TailnetEnv): Effect.Effect<string, SealFailed> =>
  Effect.gen(function* sign() {
    const signer = yield* oidcSigner(env);
    const { kid = "" } = yield* publicJwk(signer);
    return yield* Effect.promise(() =>
      new SignJWT({})
        .setProtectedHeader({ alg: JWT_ALGORITHM, kid, typ: "JWT" })
        .setIssuer(TAILNET_ISSUER)
        .setSubject(AGENT_SUBJECT)
        .setAudience(env.TAILNET_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(ID_TOKEN_LIFETIME)
        .sign(signer.privateKey),
    );
  });

const joinTailnet =
  (publicKey: unknown) =>
  (
    env: TailnetEnv,
  ): Effect.Effect<JoinedTailnet, Schema.SchemaError | SealFailed | SshCertificateFailed> =>
    Effect.gen(function* join() {
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
      const token = yield* idToken(env);
      yield* Effect.logInfo("tailnet.joined");
      return {
        clientId: `${env.TAILNET_CLIENT_ID}?${NODE_OPTIONS}`,
        idToken: token,
        tags: [AGENT_TAG],
        sshUser: SSH_USER,
        sshCertificate,
        expiresAt: DateTime.formatIso(
          DateTime.makeUnsafe(issuedAt + CERTIFICATE_LIFETIME_SECONDS * MS_PER_SECOND),
        ),
      };
    });

export { joinTailnet };
export type { JoinedTailnet, TailnetEnv };
