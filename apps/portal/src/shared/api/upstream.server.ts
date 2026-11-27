import type { PortalResult } from "@masseater.dev/portal-protocol";
import { Effect, Schema } from "effect";

import { Upstreams } from "./bindings.server.ts";
import type { UpstreamBindings } from "./bindings.server.ts";
import { PortalFailed } from "./portal-failed.ts";

const decodeFailed = ({ message }: Readonly<{ message: string }>): PortalFailed =>
  PortalFailed.make({ errorTag: "SchemaError", text: message });

const callFailed = (error: unknown): PortalFailed =>
  PortalFailed.make({ errorTag: "UpstreamFailed", text: String(error) });

export type Call<Result> = (bindings: UpstreamBindings) => Promise<Result>;

export const attempt = Effect.fn("portal.attempt")(function* attempt<Result>(call: Call<Result>) {
  const bindings = yield* Upstreams;
  return yield* Effect.tryPromise({ try: () => call(bindings), catch: callFailed });
});

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
}: Readonly<{ schema: Codec; call: Call<PortalResult> }>): Effect.Effect<
  Codec["Type"],
  PortalFailed,
  Upstreams
> => attempt(call).pipe(Effect.flatMap(bodyOf(schema)));

export const jsonBody = <Codec extends Schema.Top & Readonly<{ DecodingServices: never }>>({
  schema,
  call,
}: Readonly<{ schema: Codec; call: Call<Response> }>): Effect.Effect<
  Codec["Type"],
  PortalFailed,
  Upstreams
> =>
  attempt(call).pipe(
    Effect.flatMap((response) =>
      Effect.tryPromise({ try: () => response.json(), catch: callFailed }),
    ),
    Effect.flatMap(decoded(schema)),
  );
