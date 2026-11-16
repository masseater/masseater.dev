import { Config, Effect, Option, String as Str } from "effect";

import { PREFIX, captured, envNameOf, toJson } from "#/entities/decision/index.ts";
import type { DecideInput, WireRequest } from "#/entities/decision/index.ts";

import { appContext } from "./app-context.ts";
import { sendSystemOne } from "./system-one.ts";

const DEFAULT_GATEWAY = "default";
const DEFAULT_API_URL = "https://api.cloudflare.com/client/v4";
const RUN_PATH = "/ai/run";
const TRAILING_SLASHES = /\/+$/u;
const MODEL_NAME = /(?<name>[^/]+)$/u;

const accountUrl = ({ api, account }: Readonly<{ api: string; account: string }>): string =>
  `${Str.replace(TRAILING_SLASHES, "")(Str.trim(api))}/accounts/${Str.trim(account)}`;

/** @internal */
export const endpointOf = (env: DecideInput["env"]): Config.Config<string> =>
  Config.all({
    api: Config.String(envNameOf(env, "CLOUDFLARE_API_BASE_URL")).pipe(
      Config.withDefault(DEFAULT_API_URL),
    ),
    account: Config.NonEmptyString(envNameOf(env, "CLOUDFLARE_ACCOUNT_ID")),
  }).pipe(Config.map(accountUrl));

const modelNameOf = (model: string): string =>
  Option.getOrElse(captured(Str.match(MODEL_NAME)(model), "name"), () => model);

/** @internal */
export const sendWorkersAi = Effect.fn("sendWorkersAi")(function* sendWorkersAi(
  endpoint: string,
  wire: WireRequest,
  { env }: Pick<DecideInput, "env">,
) {
  const token = yield* Config.Redacted(envNameOf(env, "CLOUDFLARE_API_TOKEN"));
  const gateway = yield* Config.NonEmptyString(envNameOf(env, "CLOUDFLARE_AI_GATEWAY_ID")).pipe(
    Config.withDefault(DEFAULT_GATEWAY),
  );
  const app = yield* appContext;
  const decided = yield* sendSystemOne(
    {
      url: `${endpoint}${RUN_PATH}/${wire.model}`,
      model: modelNameOf(wire.model),
      token,
      headers: {
        "cf-aig-gateway-id": gateway,
        "cf-aig-metadata": toJson({ tool: PREFIX, ...app }),
      },
      envelope: true,
    },
    wire,
  );
  return { model: wire.model, answers: decided.answers };
});
