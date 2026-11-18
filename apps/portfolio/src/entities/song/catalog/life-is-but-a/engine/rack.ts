import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import type { Studio } from "@masseater.dev/fumx-studio/studio/studio";
import { Option } from "effect";

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
