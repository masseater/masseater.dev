import type {
  CredentialStatusRpc,
  MoneyPortalRpc,
  SlidesRpc,
  WatashiPortalRpc,
} from "@masseater.dev/portal-protocol";
import { Context, Effect, Option, pipe } from "effect";

import { PERSONAL_ORIGIN } from "#/shared/config/index.ts";

export type Methods<Entrypoint> = Readonly<Omit<Entrypoint, keyof Rpc.WorkerEntrypointBranded>>;

export type UpstreamBindings = Readonly<{
  PERSONAL: Readonly<{ fetch: (input: string) => Promise<Response> }>;
  WATASHI: Methods<WatashiPortalRpc>;
  MONEY: Methods<MoneyPortalRpc>;
  SLIDES: Methods<SlidesRpc>;
  CREDENTIALS: Methods<CredentialStatusRpc>;
}>;

export class Upstreams extends Context.Service<Upstreams, UpstreamBindings>()(
  "portal/shared/api/bindings.server/Upstreams",
) {}

export const personal =
  (path: string) =>
  ({ PERSONAL }: UpstreamBindings): Promise<Response> =>
    PERSONAL.fetch(`${PERSONAL_ORIGIN}${path}`);

const bindingsOf = new WeakMap<Request, UpstreamBindings>();

export const upstreamsFor = (request: Request): Effect.Effect<UpstreamBindings> =>
  pipe(bindingsOf.get(request), Option.fromUndefinedOr, Effect.fromOption, Effect.orDie);

export const servingUpstreams =
  (bindings: UpstreamBindings) =>
  (handle: (request: Request) => Promise<Response>) =>
  (request: Request): Promise<Response> => {
    bindingsOf.set(request, bindings);
    return handle(request);
  };
