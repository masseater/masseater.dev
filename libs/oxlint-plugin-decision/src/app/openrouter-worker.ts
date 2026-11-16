import { Config, String as Str } from "effect";

import { envNameOf, mergeResponses, wireRequestsFor } from "#/entities/decision/index.ts";
import { send, serveDecisions } from "#/features/serve-decisions/index.ts";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const API_SUFFIX = /\/api\/v1\/*$|\/+$/u;

serveDecisions({
  endpoint: (env) =>
    Config.String(envNameOf(env, "OPENROUTER_BASE_URL")).pipe(
      Config.withDefault(DEFAULT_BASE_URL),
      Config.map((url) => Str.replace(API_SUFFIX, "")(Str.trim(url))),
    ),
  wires: wireRequestsFor,
  combine: mergeResponses,
  send,
});
