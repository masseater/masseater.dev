import { runner } from "@r_masseater/workers-tracing/effect";
import type { Run } from "@r_masseater/workers-tracing/effect";

import { ownerGuard } from "#/entities/api-token/index.server.ts";
import type { Gate } from "#/entities/api-token/index.server.ts";

import { watashiLayer } from "./layer.server.ts";
import type { WatashiBindings, WatashiServices } from "./layer.server.ts";

/** @internal */
export const gateOf = (bindings: WatashiBindings): Gate<WatashiServices> => {
  const run: Run<WatashiServices> = runner(watashiLayer(bindings));
  return { guard: ownerGuard(bindings), run };
};
