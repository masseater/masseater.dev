import { callerOf } from "@masseater.dev/mcp-tool-call";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { runner } from "@r_masseater/workers-tracing/effect";
import { env } from "cloudflare:workers";
import { Effect, Logger } from "effect";
import { createRemoteJWKSet } from "jose";

import { certsUrl, verifyAccess } from "./access";
import { registerTools } from "./tools";

const FORBIDDEN = 403;

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const verifier = {
  keys: createRemoteJWKSet(certsUrl(env.ACCESS_TEAM_DOMAIN)),
  teamDomain: env.ACCESS_TEAM_DOMAIN,
  audience: env.ACCESS_AUDIENCE,
};

const serveMcp = (request: Request): Promise<Response> =>
  runLogged(
    verifyAccess(request, verifier).pipe(
      Effect.flatMap((claims) =>
        Effect.promise(() =>
          createMcpHandler(() =>
            registerTools(callerOf({ request, azp: claims["azp"], clientId: claims["client_id"] })),
          ).fetch(request),
        ),
      ),
      Effect.catchTag("AccessDenied", ({ reason }) =>
        Effect.logWarning("access denied").pipe(
          Effect.annotateLogs({ event: "access_denied", reason }),
          Effect.as(new Response("Forbidden", { status: FORBIDDEN })),
        ),
      ),
    ),
  );

export { serveMcp };
