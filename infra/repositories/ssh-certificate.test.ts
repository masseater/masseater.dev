import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { ChildProcess } from "effect/process";
import { expect } from "vite-plus/test";

import { fails } from "./app-store.test.support.ts";
import { authorizedKey, generateCa, signCertificate } from "./ssh-certificate.ts";

const ISSUED_AT = 1_800_000_000_000;
const LIFETIME_SECONDS = 3600;
const KEY_ID = "sundries";
const PRINCIPAL = "u1";
const FINGERPRINT_FIELD = 1;

const sshKeygen = Effect.fn("sshKeygen")(function* sshKeygen(args: readonly string[]) {
  const handle = yield* ChildProcess.make("ssh-keygen", args);
  const [output] = yield* Effect.all(
    [handle.stdout.pipe(Stream.decodeText(), Stream.mkString), handle.exitCode],
    { concurrency: "unbounded" },
  );
  return output;
});

const workspace = Effect.fn("workspace")(function* workspace() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = yield* fs.makeTempDirectoryScoped({ prefix: "ssh-certificate-" });
  const keyFile = path.join(dir, "id");
  yield* sshKeygen(["-q", "-t", "ed25519", "-N", "", "-f", keyFile]);
  const publicKey = yield* fs.readFileString(`${keyFile}.pub`);
  const inspect = Effect.fn("inspect")(function* inspect(name: string, line: string) {
    const file = path.join(dir, name);
    yield* fs.writeFileString(file, `${line}\n`);
    return file;
  });
  return { publicKey, inspect };
});

const fingerprintOf = (file: string): ReturnType<typeof sshKeygen> =>
  sshKeygen(["-l", "-f", file]).pipe(
    Effect.map((listing) =>
      pipe(
        Str.split(" ")(listing),
        Arr.get(FINGERPRINT_FIELD),
        Option.getOrElse(() => ""),
      ),
    ),
  );

const issued = Effect.gen(function* issued() {
  const ca = yield* generateCa;
  const { publicKey, inspect } = yield* workspace();
  const certificate = yield* signCertificate({
    ca,
    publicKey,
    keyId: KEY_ID,
    principals: [PRINCIPAL],
    issuedAt: ISSUED_AT,
    lifetimeSeconds: LIFETIME_SECONDS,
  });
  const certificateFile = yield* inspect("id-cert.pub", certificate);
  const caLine = yield* authorizedKey(ca);
  const caFile = yield* inspect("ca.pub", caLine);
  const listed = yield* sshKeygen(["-L", "-f", certificateFile]);
  const fingerprint = yield* fingerprintOf(caFile);
  return { listed, fingerprint };
});

const certifies = Effect.gen(function* certifies() {
  const { listed, fingerprint } = yield* issued;
  expect(listed).toContain("Type: ssh-ed25519-cert-v01@openssh.com user certificate");
  expect(listed).toContain(`Key ID: "${KEY_ID}"`);
  expect(listed).toMatch(new RegExp(`Principals: \\n\\s+${PRINCIPAL}\\n`, "u"));
  expect(listed).toContain("permit-port-forwarding");
  expect(listed).toContain("permit-pty");
  expect(fingerprint).toMatch(/^SHA256:/u);
  expect(listed).toContain(`Signing CA: ED25519 ${fingerprint}`);
});

const refusesRsa = Effect.gen(function* refusesRsa() {
  const ca = yield* generateCa;
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
});

layer(nodeServicesLayer)("SSH の利用者の証明書", (it) => {
  it.effect("ssh-keygen が CA の署名を確かめて読める証明書を作る", () => certifies);
  it.effect("ed25519 でない公開鍵には証明書を出さない", () => refusesRsa);
});
