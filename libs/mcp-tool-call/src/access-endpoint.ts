import { createMcpHandler } from "@modelcontextprotocol/server";
import type { McpServer } from "@modelcontextprotocol/server";
import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Logger } from "effect";
import { createRemoteJWKSet } from "jose";

import { certsUrl, verifyAccess } from "./access.ts";
import type { AccessVerifier } from "./access.ts";
import { callerOf } from "./caller.ts";
import type { Caller } from "./caller.ts";

type AccessEndpoint = Readonly<{
  teamDomain: string;
  audience: string;
  register: (caller: Caller) => McpServer;
}>;

const FORBIDDEN = 403;

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const serveVerified =
  (verifier: AccessVerifier, register: AccessEndpoint["register"]) =>
  (request: Request): Promise<Response> =>
    runLogged(
      verifyAccess(request, verifier).pipe(
        Effect.flatMap((claims) =>
          Effect.promise(() =>
            createMcpHandler(() =>
              register(callerOf({ request, azp: claims["azp"], clientId: claims["client_id"] })),
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

const accessMcpEndpoint = ({
  teamDomain,
  audience,
  register,
}: AccessEndpoint): ((request: Request) => Promise<Response>) =>
  serveVerified({ keys: createRemoteJWKSet(certsUrl(teamDomain)), teamDomain, audience }, register);

export { accessMcpEndpoint };
export type { AccessEndpoint };
