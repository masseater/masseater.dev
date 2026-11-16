import { Config, Effect, String as Str } from "effect";

import { envNameOf } from "#/entities/decision/index.ts";
import type { DecideInput, WireRequest } from "#/entities/decision/index.ts";

import { sendSystemOne } from "./system-one.ts";

const DEFAULT_BASE_URL = "https://api.typesafe.ai";
const SYSTEM_ONE_PATH = "/v1/systemone";
const TRAILING_SLASHES = /\/+$/u;

/** @internal */
export const typesafeEndpointOf = (env: DecideInput["env"]): Config.Config<string> =>
  Config.String(envNameOf(env, "TYPESAFE_BASE_URL")).pipe(
    Config.withDefault(DEFAULT_BASE_URL),
    Config.map((url) => Str.replace(TRAILING_SLASHES, "")(Str.trim(url))),
  );

/** @internal */
export const sendTypesafe = Effect.fn("sendTypesafe")(function* sendTypesafe(
  endpoint: string,
  wire: WireRequest,
  { env }: Pick<DecideInput, "env">,
) {
  const token = yield* Config.Redacted(envNameOf(env, "TYPESAFE_API_KEY"));
  return yield* sendSystemOne(
    {
      url: `${endpoint}${SYSTEM_ONE_PATH}`,
      model: wire.model,
      token,
      headers: {},
      envelope: false,
    },
    wire,
  );
});
