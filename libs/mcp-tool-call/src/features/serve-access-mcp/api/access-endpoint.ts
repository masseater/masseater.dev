import type { McpServer } from "@modelcontextprotocol/server";
import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Logger } from "effect";
import { createRemoteJWKSet } from "jose";

import { meteredMcpHandler } from "#/entities/tool-call/index.ts";
import { certsUrl, verifyAccess } from "#/shared/lib/access.ts";

export type AccessMcp = Readonly<{
  teamDomain: string;
  audience: string;
  register: () => McpServer;
  dataset: AnalyticsEngineDataset;
}>;

const FORBIDDEN = 403;

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const accessMcpEndpoint = ({ teamDomain, audience, register, dataset }: AccessMcp) => {
  const verifier = { keys: createRemoteJWKSet(certsUrl(teamDomain)), teamDomain, audience };
  const serve = meteredMcpHandler(dataset)(register);
  return (request: Request): Promise<Response> =>
    runLogged(
      verifyAccess(request, verifier).pipe(
        Effect.flatMap((claims) => Effect.promise(() => serve(request, claims))),
        Effect.catchTag("AccessDenied", ({ reason }) =>
          Effect.logWarning("access denied").pipe(
            Effect.annotateLogs({ event: "access_denied", reason }),
            Effect.as(new Response("Forbidden", { status: FORBIDDEN })),
          ),
        ),
      ),
    );
};

export const accessMcpRoute = <Env extends object>(
  configOf: (env: Env) => AccessMcp,
): ((env: Env) => (request: Request) => Promise<Response>) => {
  const endpoints = new WeakMap<Env, (request: Request) => Promise<Response>>();
  return (env) => endpoints.getOrInsertComputed(env, (found) => accessMcpEndpoint(configOf(found)));
};
