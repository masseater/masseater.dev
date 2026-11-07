import { Rules, Ruleset, Workers, providers, state } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect } from "effect";

import { APP_NAME, ENV_PREFIX, requireAppPrefix } from "./app-name.ts";
import { BASE_PATH } from "./base-path.ts";

const ZONE = "masseater.dev";
const LEGACY_HOST = "mst-ja-decision-bench.masseater.dev";
const LEGACY_REDIRECT_LIST = `${ENV_PREFIX}legacy_host`;

const COMPATIBILITY = { date: "2026-08-25" } as const;
const CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";

const site = Effect.gen(function* site() {
  const build = yield* Build("WebBuild", {
    command: "vp run build",
    env: { VITE_CF_BEACON_TOKEN: CF_BEACON_TOKEN },
    outdir: "dist/client",
    memo: false,
  });
  return yield* Workers.Worker("Web", {
    compatibility: COMPATIBILITY,
    logpush: true,
    domain: LEGACY_HOST,
    routes: [{ pattern: `${ZONE}${BASE_PATH}*`, zoneName: ZONE }],
    assets: {
      directory: build.outdir,
      htmlHandling: "auto-trailing-slash",
    },
  });
});

const legacyHostRedirect = Effect.gen(function* legacyHostRedirect() {
  const list = yield* Rules.List("LegacyHostRedirects", {
    name: LEGACY_REDIRECT_LIST,
    kind: "redirect",
    items: [
      {
        redirect: {
          sourceUrl: `${LEGACY_HOST}/`,
          targetUrl: `https://${ZONE}${BASE_PATH}/`,
          statusCode: 301,
          subpathMatching: true,
          preservePathSuffix: true,
          preserveQueryString: true,
        },
      },
    ],
  });
  return yield* Ruleset.AccountEntrypoint("BulkRedirects", {
    phase: "http_request_redirect",
    rules: [
      {
        action: "redirect",
        expression: `http.request.full_uri in $${LEGACY_REDIRECT_LIST}`,
        actionParameters: { fromList: { name: list.name, key: "http.request.full_uri" } },
      },
    ],
  });
});

export default Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* site;
    yield* legacyHostRedirect;
    yield* requireAppPrefix;
    return { url };
  }),
);
