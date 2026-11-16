import { Context } from "effect";
import type { Effect } from "effect";

/** @internal */
export class ServerUrl extends Context.Service<
  ServerUrl,
  { readonly url: Effect.Effect<string> }
>()("@masseater.dev/local-server/entities/endpoint/model/server-url/ServerUrl") {}
