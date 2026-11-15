#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Console, Effect, Schema, pipe } from "effect";
import { Argument, Command } from "effect/cli";
import { HttpClient } from "effect/http";

const FOUND = 302;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const OK = 200;
const REFUSED: ReadonlySet<number> = new Set([FOUND, UNAUTHORIZED, FORBIDDEN]);
const FEWEST_PATHS = 1;
const RESOURCE_METADATA = "/.well-known/oauth-protected-resource";
const TIMEOUT = "30 seconds";

const taggedError = Schema.TaggedError;

class NotProtected extends taggedError<NotProtected, { readonly brand: unique symbol }>()(
  "NotProtected",
  { message: Schema.String },
) {}

type HttpFailure = Effect.Error<ReturnType<typeof statusOf>>;

const statusOf = Effect.fn("statusOf")(function* statusOf(url: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.get(url).pipe(Effect.timeout(TIMEOUT));
  return response.status;
});

const refused = (
  url: string,
): Effect.Effect<number, NotProtected | HttpFailure, HttpClient.HttpClient> =>
  statusOf(url).pipe(
    Effect.filterOrFail(
      (status) => REFUSED.has(status),
      (status) => NotProtected.make({ message: `${url} answered ${status} without Access` }),
    ),
  );

const advertised = (
  origin: string,
): Effect.Effect<number, NotProtected | HttpFailure, HttpClient.HttpClient> => {
  const url = `${origin}${RESOURCE_METADATA}`;
  return statusOf(url).pipe(
    Effect.filterOrFail(
      (status) => status === OK,
      (status) =>
        NotProtected.make({
          message: `${url} answered ${status}, so MCP clients cannot find the Access OAuth server`,
        }),
    ),
  );
};

const command = Command.make(
  "access-check",
  {
    origin: Argument.String("origin"),
    paths: Argument.String("path").pipe(Argument.atLeast(FEWEST_PATHS)),
  },
  ({ origin, paths }) =>
    Effect.gen(function* accessCheck() {
      const urls = pipe(
        paths,
        Arr.map((path) => `${origin}${path}`),
      );
      yield* Effect.forEach(urls, (url) => refused(url), { discard: true });
      yield* advertised(origin);
      yield* Console.log(
        `${origin} refuses requests without Access and advertises its OAuth server`,
      );
    }),
);

runMain("access-check")(Command.run(command, { version: "0.0.0" }));
