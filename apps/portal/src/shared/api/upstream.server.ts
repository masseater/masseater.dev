import type { PortalResult } from "@masseater.dev/portal-protocol";
import { Effect, Schema } from "effect";

import { PortalFailed } from "./portal-failed";

type Decodable = Schema.Top & Readonly<{ DecodingServices: never }>;

type Call<Codec, Result> = Readonly<{ schema: Codec; call: () => Promise<Result> }>;

const decodeFailed = ({ message }: Readonly<{ message: string }>): PortalFailed =>
  PortalFailed.make({ errorTag: "SchemaError", text: message });

const callFailed = (error: unknown): PortalFailed =>
  PortalFailed.make({ errorTag: "UpstreamFailed", text: String(error) });

const attempt = <Result>(call: () => Promise<Result>): Effect.Effect<Result, PortalFailed> =>
  Effect.tryPromise({ try: call, catch: callFailed });

const decoded =
  <Codec extends Decodable>(schema: Codec) =>
  (value: unknown): Effect.Effect<Codec["Type"], PortalFailed> =>
    Schema.decodeUnknownEffect(schema)(value).pipe(Effect.mapError(decodeFailed));

const bodyOf =
  <Codec extends Decodable>(schema: Codec) =>
  (result: PortalResult): Effect.Effect<Codec["Type"], PortalFailed> => {
    if (result.status === "failed") {
      return Effect.fail(PortalFailed.make({ errorTag: result.errorTag, text: result.text }));
    }
    return decoded(schema)(result.body);
  };

const rpcBody = <Codec extends Decodable>({
  schema,
  call,
}: Call<Codec, PortalResult>): Effect.Effect<Codec["Type"], PortalFailed> =>
  attempt(call).pipe(Effect.flatMap(bodyOf(schema)));

const jsonBody = <Codec extends Decodable>({
  schema,
  call,
}: Call<Codec, Response>): Effect.Effect<Codec["Type"], PortalFailed> =>
  attempt(call).pipe(
    Effect.flatMap((response) => attempt(() => response.json())),
    Effect.flatMap(decoded(schema)),
  );

export { attempt, jsonBody, rpcBody };
