import { Option, Predicate, Schema, pipe } from "effect";

export interface ProcessorBase {
  readonly port: MessagePort;
}

export type ProcessorClass = new () => ProcessorBase;

export type Registrar = (name: string, processor: ProcessorClass) => void;

const taggedError = Schema.TaggedError;

class WorkletMissing extends taggedError<WorkletMissing, { readonly brand: unique symbol }>()(
  "WorkletMissing",
  { global: Schema.String },
) {}

const isClass = (value: unknown): value is ProcessorClass => Predicate.isFunction(value);

const isRegistrar = (value: unknown): value is Registrar => Predicate.isFunction(value);

const globalOf =
  <Value>(guard: (value: unknown) => value is Value) =>
  (key: string): Value =>
    pipe(
      Option.liftPredicate(globalThis, Predicate.hasProperty(key)),
      Option.map((scope) => scope[key]),
      Option.filter(guard),
      Option.getOrThrowWith(() => WorkletMissing.make({ global: key })),
    );

export const processorBase = (): ProcessorClass => globalOf(isClass)("AudioWorkletProcessor");

export const registrar = (): Registrar => globalOf(isRegistrar)("registerProcessor");

export const clockOf = (key: "sampleRate" | "currentTime"): number =>
  globalOf(Predicate.isNumber)(key);
