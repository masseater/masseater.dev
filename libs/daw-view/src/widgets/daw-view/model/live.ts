import { Effect, Option, Schema } from "effect";

import type { LiveMix, MixMessage } from "./contract.ts";

const PROCESSOR = "daw-view-mix";
const NONE = 0;
const ONE = 1;
const STEREO = 2;

export const HEARD = { silent: 0, started: 1, ended: 2 } as const;

const moduleOf = (player: string): string => `const createPlayer = ${player};
registerProcessor("${PROCESSOR}", class extends AudioWorkletProcessor {
  constructor() {
    super();
    this.player = null;
    this.cue = 0;
    this.port.onmessage = ({ data }) => {
      if ("init" in data) {
        this.player = createPlayer(data.init, sampleRate);
        return;
      }
      if (data.play !== undefined) {
        this.cue = data.play;
      }
      if (this.player) {
        this.player.msg(data);
      }
    };
  }
  process(inputs, outputs) {
    const [left, right] = outputs[0];
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
  node.port.postMessage({ init: live.init }, [...live.transfer]);
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
