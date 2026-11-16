import { Effect, MutableRef, Option, Schema } from "effect";

import type { Receiver } from "#/features/receive-otlp/index.ts";

const taggedError = Schema.TaggedError;

export class ReceiverNotRunning extends taggedError<
  ReceiverNotRunning,
  { readonly brand: unique symbol }
>()("ReceiverNotRunning", { message: Schema.String }) {}

const current = MutableRef.make(Option.none<Receiver>());

export const setReceiver = (receiver: Option.Option<Receiver>): void => {
  MutableRef.set(current, receiver);
};

const notRunning = (): ReceiverNotRunning =>
  ReceiverNotRunning.make({
    message:
      "The OTLP receiver is not running. Add otlp() from @r_masseater/vitest-otlp to the Vitest plugins.",
  });

export const currentReceiver: Effect.Effect<Receiver, ReceiverNotRunning> = Effect.suspend(() =>
  Effect.fromOption(MutableRef.get(current)),
).pipe(Effect.mapError(notRunning));
