import { TOKEN_PARAMETER } from "@masseater.dev/aredoko-protocol";
import { Context, Layer, Option, Redacted, String, pipe } from "effect";
import { Mac } from "effect/crypto";
import { Hex } from "effect/encoding";

const TOKEN_BYTES = 32;
const QUERY_MARK = "?";

interface Handshake {
  readonly req: { readonly url?: string | undefined };
}

class ServerToken extends Context.Service<
  ServerToken,
  {
    readonly token: Redacted.Redacted;
    readonly presentedBy: (handshake: Handshake) => boolean;
  }
>()("aredoko-server/app/rpc/server-token/ServerToken") {}

const encoder = new TextEncoder();

const tokenIn = (target: string): Option.Option<string> =>
  pipe(
    target,
    String.indexOf(QUERY_MARK),
    Option.map((start) => new URLSearchParams(pipe(target, String.slice(start)))),
    Option.flatMapNullishOr((query) => query.get(TOKEN_PARAMETER)),
  );

const serverTokenLayer = Layer.sync(ServerToken, () => {
  const token = Hex.encode(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
  const expected = encoder.encode(token);
  return ServerToken.of({
    token: Redacted.make(token),
    presentedBy: ({ req: { url } }) =>
      pipe(
        Option.fromUndefinedOr(url),
        Option.flatMap(tokenIn),
        Option.exists((given) => Mac.timingSafeEqual(encoder.encode(given), expected)),
      ),
  });
});

export { ServerToken, serverTokenLayer };
