import { Effect, Option, Schema } from "effect";

import type { LiveMix, MixMessage } from "./contract.ts";

const PROCESSOR = "daw-view-mix";
const NONE = 0;
const ONE = 1;
const STEREO = 2;
const AHEAD_BLOCKS = 8;

export const HEARD = { silent: 0, started: 1, ended: 2 } as const;

const READER = `const AHEAD = ${AHEAD_BLOCKS};
class TapeReader {
  constructor(port, frames, blocks) {
    this.port = port;
    this.frames = frames;
    this.blocks = blocks;
    this.held = new Map();
    this.at = -2;
    this.pin = -2;
    port.onmessage = ({ data }) => {
      if (this.held.has(data.block)) this.held.set(data.block, data.tracks);
    };
  }
  near(k, b) {
    return k >= b - 1 && k <= b + AHEAD;
  }
  keep(b) {
    for (const k of this.held.keys()) {
      if (!this.near(k, this.at) && !this.near(k, this.pin)) this.held.delete(k);
    }
    for (let k = Math.max(0, b); k <= b + AHEAD && k < this.blocks; k++) {
      if (!this.held.has(k)) {
        this.held.set(k, null);
        this.port.postMessage({ want: k });
      }
    }
  }
  block(b) {
    if (b !== this.at) {
      this.at = b;
      this.keep(b);
    }
    return this.held.get(b) || null;
  }
  ready(frame) {
    const b = Math.floor(frame / this.frames);
    if (b !== this.pin) {
      this.pin = b;
      this.keep(b);
    }
    return Boolean(this.held.get(b)) && (b + 1 >= this.blocks || Boolean(this.held.get(b + 1)));
  }
}
`;

const WORKLET = `registerProcessor("${PROCESSOR}", class extends AudioWorkletProcessor {
  constructor() {
    super();
    this.player = null;
    this.tape = null;
    this.wait = null;
    this.cue = 0;
    this.port.onmessage = ({ data }) => {
      if ("init" in data) {
        if (data.tape) this.tape = new TapeReader(data.tape, data.frames, data.blocks);
        this.player = createPlayer(data.init, sampleRate, this.tape);
        return;
      }
      if (data.play !== undefined) {
        this.cue = data.play;
        if (this.tape) {
          this.wait = data.play;
          return;
        }
      }
      if (data.stop) this.wait = null;
      if (this.player) {
        this.player.msg(data);
      }
    };
  }
  process(inputs, outputs) {
    const [left, right] = outputs[0];
    if (this.player && this.wait !== null && this.tape.ready(this.wait)) {
      this.player.msg({ play: this.wait });
      this.wait = null;
    }
    if (this.player && right) {
      const heard = this.player.render(left, right, left.length);
      if (heard !== ${HEARD.silent}) {
        this.port.postMessage({ heard, at: currentTime, frame: this.cue });
      }
    }
    return true;
  }
});
`;

const moduleOf = (player: string): string => `const createPlayer = ${player};\n${READER}${WORKLET}`;

const taggedError = Schema.TaggedError;

class LiveUnavailable extends taggedError<LiveUnavailable, { readonly brand: unique symbol }>()(
  "LiveUnavailable",
  { reason: Schema.String },
) {}

const unavailable = (cause: unknown): LiveUnavailable =>
  LiveUnavailable.make({ reason: String(cause) });

const HeardSchema = Schema.Struct({
  heard: Schema.Literals([HEARD.started, HEARD.ended]),
  at: Schema.Finite,
  frame: Schema.Finite,
});

export type Heard = typeof HeardSchema.Type;

const heardOf = Schema.decodeUnknownOption(HeardSchema);

export interface LiveNode {
  readonly send: (message: MixMessage) => void;
  readonly connect: (to: AnalyserNode) => void;
}

export interface LiveOpening {
  readonly context: AudioContext;
  readonly live: LiveMix;
  readonly onHeard: (event: Heard) => void;
}

const initOf = (live: LiveMix): readonly [unknown, Transferable[]] =>
  Option.match(Option.fromUndefinedOr(live.tape), {
    onNone: () => [{ init: live.init }, [...live.transfer]],
    onSome: (tape) => {
      const port = tape.port();
      return [
        { init: live.init, tape: port, frames: tape.frames, blocks: tape.blocks },
        [...live.transfer, port],
      ];
    },
  });

export const liveSupported = (): boolean => "AudioWorkletNode" in globalThis;

const loaded = (context: AudioContext, player: string): Effect.Effect<void, LiveUnavailable> =>
  Effect.acquireUseRelease(
    Effect.sync(() =>
      URL.createObjectURL(new Blob([moduleOf(player)], { type: "text/javascript" })),
    ),
    (url) =>
      Effect.tryPromise({ try: () => context.audioWorklet.addModule(url), catch: unavailable }),
    (url) =>
      Effect.sync(() => {
        URL.revokeObjectURL(url);
      }),
  );

const nodeIn = (context: AudioContext): Effect.Effect<AudioWorkletNode, LiveUnavailable> =>
  Effect.try({
    try: () =>
      new AudioWorkletNode(context, PROCESSOR, {
        numberOfInputs: NONE,
        numberOfOutputs: ONE,
        outputChannelCount: [STEREO],
      }),
    catch: unavailable,
  });

export const openLive = Effect.fn("live.open")(function* openLive({
  context,
  live,
  onHeard,
}: LiveOpening) {
  yield* loaded(context, live.player);
  const node = yield* nodeIn(context);
  node.port.addEventListener("message", ({ data }) => {
    const event = heardOf(data);
    if (Option.isSome(event)) {
      onHeard(event.value);
    }
  });
  node.port.start();
  node.port.postMessage(...initOf(live));
  const opened: LiveNode = {
    send: (message) => {
      node.port.postMessage(message, []);
    },
    connect: (to) => {
      node.connect(to);
    },
  };
  return opened;
});
