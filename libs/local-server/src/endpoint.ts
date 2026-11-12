import { Duration, Effect, Schedule, Schema } from "effect";

const ENDPOINT_FILE = "endpoint.json";
const HOST = "127.0.0.1";
const TOKEN_PARAMETER = "token";
const READ_INTERVAL = Duration.fromInputUnsafe("1 second");

const ServerEndpoint = Schema.Struct({ port: Schema.Int, token: Schema.String }).annotate({
  identifier: "ServerEndpoint",
});

const ServerEndpointJson = Schema.fromJsonString(ServerEndpoint);

const decodeEndpoint = Schema.decodeUnknownEffect(ServerEndpointJson);

const urlOf = ({ port, token }: typeof ServerEndpoint.Type): string =>
  `ws://${HOST}:${port.toString()}/?${TOKEN_PARAMETER}=${encodeURIComponent(token)}`;

const awaitEndpoint = <Failure>(read: Effect.Effect<string, Failure>): Effect.Effect<string> =>
  read.pipe(
    Effect.flatMap(decodeEndpoint),
    Effect.map(urlOf),
    Effect.retry({ schedule: Schedule.spaced(READ_INTERVAL) }),
    Effect.orDie,
  );

export { ENDPOINT_FILE, HOST, ServerEndpoint, TOKEN_PARAMETER, awaitEndpoint };
