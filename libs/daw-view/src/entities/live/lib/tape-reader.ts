import { Option, Schema } from "effect";

import type { TapeSource, TrackBlock } from "#/entities/live/model/player.ts";
import { DeliverySchema } from "#/entities/live/model/protocol.ts";

import type { Link } from "./link.ts";

const AHEAD = 8;
const BEHIND = 1;
const UNSET = -2;
const FIRST = 0;
const STEP = 1;
const NOTHING: readonly TrackBlock[] = [];

export interface TapeReader extends TapeSource {
  readonly ready: (frame: number) => boolean;
}

export interface TapeLayout {
  readonly link: Link;
  readonly frames: number;
  readonly blocks: number;
}

const deliveryOf = Schema.decodeUnknownOption(DeliverySchema);

const near =
  (center: number) =>
  (index: number): boolean =>
    index >= center - BEHIND && index <= center + AHEAD;

interface Marks {
  readonly at: number;
  readonly pin: number;
}

interface Holding {
  readonly keep: (marks: Marks, center: number) => void;
  readonly heldAt: (index: number) => Option.Option<readonly TrackBlock[]>;
}

const holdingOf = ({ link, blocks }: TapeLayout): Holding => {
  const held = new Map<number, Option.Option<readonly TrackBlock[]>>();
  link.listen((data) => {
    const delivery = deliveryOf(data);
    if (Option.isSome(delivery) && held.has(delivery.value.block)) {
      held.set(delivery.value.block, Option.some(delivery.value.tracks));
    }
  });
  return {
    keep: (marks, center) => {
      for (const index of held.keys()) {
        if (!near(marks.at)(index) && !near(marks.pin)(index)) {
          held.delete(index);
        }
      }
      for (
        let index = Math.max(FIRST, center);
        index <= center + AHEAD && index < blocks;
        index += STEP
      ) {
        if (!held.has(index)) {
          held.set(index, Option.none());
          link.send({ want: index });
        }
      }
    },
    heldAt: (index) => Option.flatten(Option.fromUndefinedOr(held.get(index))),
  };
};

export const tapeReaderOf = (layout: TapeLayout): TapeReader => {
  const { keep, heldAt } = holdingOf(layout);
  const marks = { at: UNSET, pin: UNSET };
  return {
    frames: layout.frames,
    block: (index) => {
      if (index !== marks.at) {
        marks.at = index;
        keep(marks, index);
      }
      return Option.getOrElse(heldAt(index), () => NOTHING);
    },
    ready: (frame) => {
      const index = Math.floor(frame / layout.frames);
      if (index !== marks.pin) {
        marks.pin = index;
        keep(marks, index);
      }
      return (
        Option.isSome(heldAt(index)) &&
        (index + STEP >= layout.blocks || Option.isSome(heldAt(index + STEP)))
      );
    },
  };
};

export const NO_TAPE: TapeReader = {
  frames: STEP,
  block: () => NOTHING,
  ready: () => true,
};
