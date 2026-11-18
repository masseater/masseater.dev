import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import { Option, Schema } from "effect";

import type { Kuraku } from "./kuraku.ts";
import type { Role, Step } from "./score-schema.ts";

const taggedError = Schema.TaggedError;

class MissingBus extends taggedError<MissingBus, { readonly brand: unique symbol }>()(
  "MissingBus",
  { role: Schema.String },
) {}

export interface Buses {
  readonly find: (role: Role) => Option.Option<Bus>;
  readonly at: (role: Role) => Bus;
  readonly put: (role: Role, bus: Bus) => void;
}

export const busesOf = (): Buses => {
  const held = new Map<Role, Bus>();
  const find = (role: Role): Option.Option<Bus> => Option.fromUndefinedOr(held.get(role));
  return {
    find,
    at: (role) => Option.getOrThrowWith(find(role), () => MissingBus.make({ role })),
    put: (role, bus) => {
      held.set(role, bus);
    },
  };
};

export interface Rig {
  readonly kuraku: Kuraku;
  readonly track: string;
  readonly buses: Buses;
}

export type Handlers = {
  readonly [Op in Step["op"]]: (step: Extract<Step, Readonly<{ op: Op }>>) => void;
};
