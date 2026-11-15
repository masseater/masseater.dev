import { Array as Arr, Effect, Schema, pipe } from "effect";
import { parseCertificate, parseKey } from "sshpk";
import { expect, test } from "vite-plus/test";

import { fails, memoryStore } from "./app-store.test.support.ts";
import { SSH_CA, signingKey } from "./signing-keys.ts";
import { authorizedKey, signCertificate } from "./ssh-certificate.ts";

const ISSUED_AT = 1_800_000_000_000;
const LIFETIME_SECONDS = 3600;
const MS_PER_SECOND = 1000;
const KEY_ID = "sundries";
const PRINCIPAL = "u1";

const generateKey = (): ReturnType<ReturnType<typeof signingKey>> =>
  signingKey(SSH_CA)(memoryStore().env);

const ExtensionNames = Schema.Array(Schema.Struct({ name: Schema.String }));

const extensionNames = Schema.decodeUnknownEffect(ExtensionNames);

const issue = Effect.gen(function* issue() {
  const ca = yield* generateKey();
  const subject = yield* generateKey();
  const publicKey = yield* authorizedKey(subject);
  const caLine = yield* authorizedKey(ca);
  const signed = yield* signCertificate({
    ca,
    publicKey,
    keyId: KEY_ID,
    principals: [PRINCIPAL],
    issuedAt: ISSUED_AT,
    lifetimeSeconds: LIFETIME_SECONDS,
  });
  const certificate = parseCertificate(signed, "openssh");
  const subjectKey = parseKey(publicKey, "ssh");
  const extensions = yield* extensionNames(certificate.getExtensions());
  return {
    signedByCa: certificate.isSignedByKey(parseKey(caLine, "ssh")),
    signedBySubject: certificate.isSignedByKey(subjectKey),
    certifiedKey: certificate.subjectKey.fingerprint("sha256").toString(),
    subjectKey: subjectKey.fingerprint("sha256").toString(),
    principals: pipe(
      certificate.subjects,
      Arr.map((identity) => identity.uid),
    ),
    lifetimeMs: certificate.validUntil.getTime() - certificate.validFrom.getTime(),
    extensions: pipe(
      extensions,
      Arr.map((extension) => extension.name),
    ),
  };
});

test("CA の鍵で署名を確かめられる利用者の証明書を作る", () =>
  Effect.runPromise(
    Effect.gen(function* certifies() {
      const issued = yield* issue;
      expect(issued.signedByCa).toBe(true);
      expect(issued.signedBySubject).toBe(false);
      expect(issued.certifiedKey).toBe(issued.subjectKey);
      expect(issued.principals).toStrictEqual([PRINCIPAL]);
      expect(issued.lifetimeMs).toBeGreaterThan(LIFETIME_SECONDS * MS_PER_SECOND);
      expect(issued.extensions).toStrictEqual([
        "permit-port-forwarding",
        "permit-pty",
        "permit-user-rc",
      ]);
    }),
  ));

test("ed25519 でない公開鍵には証明書を出さない", () =>
  Effect.runPromise(
    Effect.gen(function* refusesRsa() {
      const ca = yield* generateKey();
      const refused = yield* fails(
        signCertificate({
          ca,
          publicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ== someone",
          keyId: KEY_ID,
          principals: [PRINCIPAL],
          issuedAt: ISSUED_AT,
          lifetimeSeconds: LIFETIME_SECONDS,
        }),
      );
      expect(refused).toBe(true);
    }),
  ));
