import { Option } from "effect";

import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import type { Studio } from "#/entities/song/lib/studio/studio.ts";

export interface Rack {
  readonly open: (name: string, mono: boolean) => Bus;
  readonly get: (name: string) => Bus;
  readonly drop: (name: string) => void;
}

export const rackOf = (studio: Studio): Rack => {
  const open = new Map<string, Bus>();
  return {
    open: (name, mono) => {
      const bus = studio.bus({ mono, name });
      open.set(name, bus);
      return bus;
    },
    get: (name) =>
      Option.getOrThrowWith(
        Option.fromUndefinedOr(open.get(name)),
        () => new RangeError(`no bus ${name}`),
      ),
    drop: (name) => {
      open.delete(name);
    },
  };
};
