import { Match, Option } from "effect";

import { activeIn } from "#/entities/song/lib/studio/activity.ts";
import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import { timeOf } from "#/entities/song/lib/studio/moment.ts";
import { sent } from "#/entities/song/lib/studio/send.ts";

import { busesOf } from "./buses.ts";
import type { Buses, Handlers, Rig } from "./buses.ts";
import type { Kuraku } from "./kuraku.ts";
import { pastedInto } from "./lanes.ts";
import type { Step, Track } from "./score-schema.ts";
import { tones } from "./tones.ts";
import type { ToneOp } from "./tones.ts";

const ONE = 1;
const SILENT = 0;

const scaled = ({
  frames,
  bus,
  gain,
}: Readonly<{ frames: number; bus: Bus; gain: number }>): void => {
  for (const [from, to] of activeIn({ frames, pad: SILENT })(bus)) {
    for (let index = from; index < to; index += ONE) {
      bus.left[index] = (bus.left[index] ?? SILENT) * gain;
      bus.right[index] = (bus.right[index] ?? SILENT) * gain;
    }
  }
};

const stereoOf = (bus: Bus): Bus => {
  if (!bus.mono) {
    return bus;
  }
  return { ...bus, right: new Float32Array(bus.left), mono: false };
};

const boostOf =
  (kuraku: Kuraku) =>
  (step: Extract<Step, Readonly<{ op: "send" }>>): Option.Option<(seconds: number) => number> =>
    Option.map(Option.fromUndefinedOr(step.boost), (boost) => {
      const from = timeOf(kuraku.grid)(boost.from);
      const to = timeOf(kuraku.grid)(boost.to);
      return (seconds: number): number => {
        if (seconds >= from && seconds < to) {
          return boost.gain;
        }
        return ONE;
      };
    });

type SourceOp = "flush" | "gather" | "empty" | "stereo";

const sources = ({ kuraku, track, buses }: Rig): Pick<Handlers, SourceOp> => ({
  flush: ({ into, lane, mono }) => {
    const bus = kuraku.studio.bus({ mono: mono === true, name: track });
    buses.put(into, pastedInto(kuraku)({ bus, lane }));
  },
  gather: ({ into, lane }) => {
    buses.put(into, pastedInto(kuraku)({ bus: kuraku.studio.bus({ mono: true }), lane }));
  },
  empty: ({ into, mono }) => {
    buses.put(into, kuraku.studio.bus({ mono }));
  },
  stereo: ({ bus }) => {
    buses.put(bus, stereoOf(buses.at(bus)));
  },
});

const routes = ({ kuraku, buses }: Rig): Omit<Handlers, SourceOp | ToneOp> => {
  const { studio, frames } = kuraku;
  return {
    send: (step) => {
      sent(frames)({ into: buses.at(step.into), gain: step.gain, shape: boostOf(kuraku)(step) })(
        buses.at(step.from),
      );
    },
    duck: ({ bus, by, depth }) => {
      studio.envelope({ envelope: kuraku.shared()[by], depth })(buses.at(bus));
    },
    scale: ({ bus, gain }) => {
      scaled({ frames, bus: buses.at(bus), gain });
    },
    mix: ({ from, into, gain }) => {
      studio.mix({ into: buses.at(into), gain })(buses.at(from));
    },
  };
};

export const chained =
  (kuraku: Kuraku) =>
  ({ name, steps }: Track): Buses => {
    const rig = { kuraku, track: name, buses: busesOf() };
    const play = Match.type<Step>().pipe(
      Match.discriminatorsExhaustive("op")({ ...sources(rig), ...tones(rig), ...routes(rig) }),
    );
    for (const step of steps) {
      play(step);
    }
    return rig.buses;
  };
