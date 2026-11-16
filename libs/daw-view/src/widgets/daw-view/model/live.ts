import { Effect, Option, Schema } from "effect";

import { HeardSchema, PROCESSOR } from "#/entities/live/index.ts";
import type { Heard, MixMessage } from "#/entities/live/index.ts";

import type { LiveMix } from "./contract.ts";

const NONE = 0;
const ONE = 1;
const STEREO = 2;

const taggedError = Schema.TaggedError;

class LiveUnavailable extends taggedError<LiveUnavailable, { readonly brand: unique symbol }>()(
  "LiveUnavailable",
  { reason: Schema.String },
) {}

const unavailable = (cause: unknown): LiveUnavailable =>
  LiveUnavailable.make({ reason: String(cause) });

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

const loaded = (context: AudioContext, worklet: string): Effect.Effect<void, LiveUnavailable> =>
  Effect.tryPromise({ try: () => context.audioWorklet.addModule(worklet), catch: unavailable });

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
  yield* loaded(context, live.worklet);
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
