import type { PortalResult } from "@masseater.dev/portal-protocol";
import { Effect, Schema } from "effect";

import { PortalFailed } from "./portal-failed";

const decodeFailed = ({ message }: Readonly<{ message: string }>): PortalFailed =>
  PortalFailed.make({ errorTag: "SchemaError", text: message });

const callFailed = (error: unknown): PortalFailed =>
  PortalFailed.make({ errorTag: "UpstreamFailed", text: String(error) });

export const attempt = <Result>(call: () => Promise<Result>): Effect.Effect<Result, PortalFailed> =>
  Effect.tryPromise({ try: call, catch: callFailed });

const decoded =
  <Codec extends Schema.Top & Readonly<{ DecodingServices: never }>>(schema: Codec) =>
  (value: unknown): Effect.Effect<Codec["Type"], PortalFailed> =>
    Schema.decodeUnknownEffect(schema)(value).pipe(Effect.mapError(decodeFailed));

const bodyOf =
  <Codec extends Schema.Top & Readonly<{ DecodingServices: never }>>(schema: Codec) =>
  (result: PortalResult): Effect.Effect<Codec["Type"], PortalFailed> => {
    if (result.status === "failed") {
      return Effect.fail(PortalFailed.make({ errorTag: result.errorTag, text: result.text }));
    }
    return decoded(schema)(result.body);
  };

export const rpcBody = <Codec extends Schema.Top & Readonly<{ DecodingServices: never }>>({
  schema,
  call,
}: Readonly<{ schema: Codec; call: () => Promise<PortalResult> }>): Effect.Effect<
  Codec["Type"],
  PortalFailed
> => attempt(call).pipe(Effect.flatMap(bodyOf(schema)));

export const jsonBody = <Codec extends Schema.Top & Readonly<{ DecodingServices: never }>>({
  schema,
  call,
}: Readonly<{ schema: Codec; call: () => Promise<Response> }>): Effect.Effect<
  Codec["Type"],
  PortalFailed
> =>
  attempt(call).pipe(
    Effect.flatMap((response) => attempt(() => response.json())),
    Effect.flatMap(decoded(schema)),
  );
