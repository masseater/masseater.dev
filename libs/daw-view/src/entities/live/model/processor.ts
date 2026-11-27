import { Function as Fn, Option, Predicate, Schema, pipe } from "effect";

import type { Link } from "#/entities/live/lib/link.ts";
import { clockOf, processorBase, registrar } from "#/entities/live/lib/scope.ts";
import { NO_TAPE, tapeReaderOf } from "#/entities/live/lib/tape-reader.ts";
import type { TapeReader } from "#/entities/live/lib/tape-reader.ts";
import { createStore } from "#/shared/lib/store.ts";
import type { Store } from "#/shared/lib/store.ts";

import type { MixPlayer, PlayerFactory } from "./player.ts";
import { CommandSchema, HEARD, OpeningSchema, PROCESSOR } from "./protocol.ts";

const LEFT = 0;
const RIGHT = 1;
const FIRST_OUTPUT = 0;
const START = 0;

type Outputs = readonly (readonly Float32Array[])[];

interface Deck {
  readonly player: Option.Option<MixPlayer>;
  readonly tape: Option.Option<TapeReader>;
  readonly wait: Option.Option<number>;
  readonly cue: number;
}

const EMPTY: Deck = { player: Option.none(), tape: Option.none(), wait: Option.none(), cue: START };

const openingOf = Schema.decodeUnknownOption(OpeningSchema);
const commandOf = Schema.decodeUnknownOption(CommandSchema);

type Command = typeof CommandSchema.Type;

const portLinkOf = (port: Readonly<MessagePort>): Link => ({
  send: (message): void => {
    port.postMessage(message, []);
  },
  listen: (heard): void => {
    port.addEventListener("message", ({ data }) => {
      heard(data);
    });
    port.start();
  },
});

interface Wiring {
  readonly init: unknown;
  readonly link: Option.Option<Link>;
  readonly frames: number;
  readonly blocks: number;
}

const wiringOf = (data: unknown): Option.Option<Wiring> =>
  pipe(
    openingOf(data),
    Option.map(({ init, tape, frames, blocks }) => ({
      init,
      link: Option.map(Option.fromUndefinedOr(tape), portLinkOf),
      frames: frames ?? NO_TAPE.frames,
      blocks: blocks ?? NO_TAPE.frames,
    })),
  );

const opened =
  (deck: Store<Deck>, factory: PlayerFactory) =>
  ({ init, link, frames, blocks }: Wiring): void => {
    const tape = pipe(
      link,
      Option.map((wired) => tapeReaderOf({ link: wired, frames, blocks })),
    );
    const player = factory({
      init,
      sampleRate: clockOf("sampleRate"),
      tape: Option.getOrElse(tape, () => NO_TAPE),
    });
    deck.step((state) => ({ ...state, tape, player: Option.some(player) }));
  };

const heldForTape = (deck: Store<Deck>, play: number): boolean => {
  deck.step((state) => ({ ...state, cue: play }));
  if (Option.isNone(deck.read().tape)) {
    return false;
  }
  deck.step((state) => ({ ...state, wait: Option.some(play) }));
  return true;
};

const commanded =
  (deck: Store<Deck>) =>
  (command: Command): void => {
    const play = Option.fromUndefinedOr(command.play);
    if (Option.isSome(play) && heldForTape(deck, play.value)) {
      return;
    }
    if (command.stop === true) {
      deck.step((state) => ({ ...state, wait: Option.none() }));
    }
    const { player } = deck.read();
    if (Option.isSome(player)) {
      player.value.msg(command);
    }
  };

const received =
  (deck: Store<Deck>, factory: PlayerFactory) =>
  (data: unknown): void => {
    const wiring = wiringOf(data);
    if (Option.isSome(wiring)) {
      opened(deck, factory)(wiring.value);
      return;
    }
    pipe(commandOf(data), Option.map(commanded(deck)));
  };

const cued = (deck: Store<Deck>, player: MixPlayer): void => {
  const { wait, tape } = deck.read();
  if (Option.isSome(wait) && Option.isSome(tape) && tape.value.ready(wait.value)) {
    player.msg({ play: wait.value });
    deck.step((state) => ({ ...state, wait: Option.none() }));
  }
};

const rendered =
  (deck: Store<Deck>, link: Link) =>
  (player: MixPlayer, channels: readonly Float32Array[]): void => {
    const left = channels[LEFT];
    const right = channels[RIGHT];
    if (Predicate.isUndefined(left) || Predicate.isUndefined(right)) {
      return;
    }
    const heard = player.render(left, right, left.length);
    if (heard !== HEARD.silent) {
      link.send({ heard, at: clockOf("currentTime"), frame: deck.read().cue });
    }
  };

const played =
  (deck: Store<Deck>, link: Link) =>
  (outputs: Outputs): void => {
    const { player } = deck.read();
    if (Option.isSome(player)) {
      cued(deck, player.value);
      rendered(deck, link)(player.value, outputs[FIRST_OUTPUT] ?? []);
    }
  };

export const registerMix = (factory: PlayerFactory): void => {
  const Base = processorBase();
  registrar()(
    PROCESSOR,
    class extends Base {
      private readonly play: (outputs: Outputs) => void;

      public constructor() {
        super();
        const deck = createStore({ initial: EMPTY, onChange: Fn.constVoid });
        const link = portLinkOf(this.port);
        link.listen(received(deck, factory));
        this.play = played(deck, link);
      }

      public process(_inputs: Outputs, outputs: Outputs): boolean {
        this.play(outputs);
        return true;
      }
    },
  );
};
