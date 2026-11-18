import type { SiteToken } from "@masseater.dev/repositories/credential-broker";
import type { OAuthTargetId } from "@masseater.dev/repositories/oauth-targets";
import { Effect, Option } from "effect";
import { constVoid } from "effect/Function";
import type { DefaultBodyType, StrictRequest } from "msw";
import { http } from "msw/http";
import { setupServer } from "msw/node";
import type { SetupServer } from "msw/node";

export const TOKENS: Readonly<Record<string, SiteToken>> = {
  "twilog/r_masseater": {
    status: "ok",
    site: "twilog/r_masseater",
    accessToken: "token-r_masseater",
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
  "twilog/u1_mas": {
    status: "login",
    site: "twilog/u1_mas",
    loginUrl: "https://credentials.masseater.dev/access-oauth/login?site=twilog%2Fu1_mas",
  },
};

export const tokens = { current: TOKENS };

export const env = {
  TOOL_CALLS: { writeDataPoint: constVoid },
  ACCESS_OAUTH: {
    token: (site: OAuthTargetId): Promise<SiteToken> =>
      Promise.resolve(
        tokens.current[site] ?? { status: "failed", site, message: "unknown target" },
      ),
  },
};

const EMPTY = 0;

const workerRequestOf = (request: StrictRequest<DefaultBodyType>, body: ArrayBuffer): Request =>
  new Request(request.url, {
    method: request.method,
    headers: [...request.headers],
    body: Option.getOrNull(Option.liftPredicate(body, (bytes) => bytes.byteLength > EMPTY)),
  });

const answering =
  (answer: (request: Request) => Promise<Response>) =>
  ({ request }: Readonly<{ request: StrictRequest<DefaultBodyType> }>): Promise<Response> =>
    Effect.runPromise(
      Effect.promise(() => request.arrayBuffer()).pipe(
        Effect.map((body) => workerRequestOf(request, body)),
        Effect.flatMap((worker) => Effect.promise(() => answer(worker))),
      ),
    );

export const networkAnswering = (answer: (request: Request) => Promise<Response>): SetupServer =>
  setupServer(http.all("*", answering(answer)));
