import { PrivateKey, PrivateKeyInfo } from "@peculiar/asn1-pkcs8";
import { rsaEncryption } from "@peculiar/asn1-rsa";
import { AsnConvert } from "@peculiar/asn1-schema";
import { Effect, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";
import type { EncodingError } from "effect/encoding/EncodingError";

const PEM_ARMOR = /-----[A-Z ]+-----|\s/gu;

const PKCS8_LABEL = "PRIVATE KEY";

const toPkcs8 = (pkcs1: string): Effect.Effect<string, EncodingError> =>
  pipe(
    pkcs1,
    Str.replaceAll(PEM_ARMOR, ""),
    Base64.decode,
    Effect.fromResult,
    Effect.map(
      (der) =>
        new PrivateKeyInfo({ privateKeyAlgorithm: rsaEncryption, privateKey: new PrivateKey(der) }),
    ),
    Effect.map((info) => Base64.encode(new Uint8Array(AsnConvert.serialize(info)))),
    Effect.map((body) => `-----BEGIN ${PKCS8_LABEL}-----\n${body}\n-----END ${PKCS8_LABEL}-----`),
  );

export { toPkcs8 };
