import {
  Cause,
  DateTime,
  Config,
  Console,
  Effect,
  Exit,
  Option,
  Schema,
  String as Str,
  Function as Fn,
} from "effect";

import { PREFIX } from "./options.ts";
import type { ResolvedOptions } from "./types.ts";

const DATA_FIRST_ARITY = 2;

const encodeJson = Schema.encodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

const toJson = (value: unknown): string => Option.getOrElse(encodeJson(value), () => String(value));

const nowMs = (): number => DateTime.toEpochMillis(DateTime.nowUnsafe());

const runOrElse: {
  <Value>(
    fallback: (error: unknown) => Value,
  ): <Failure>(effect: Effect.Effect<Value, Failure>) => Value;
  <Value, Failure>(
    effect: Effect.Effect<Value, Failure>,
    fallback: (error: unknown) => Value,
  ): Value;
} = Fn.dual(
  DATA_FIRST_ARITY,
  <Value, Failure>(
    effect: Effect.Effect<Value, Failure>,
    fallback: (error: unknown) => Value,
  ): Value =>
    Exit.match(Effect.runSyncExit(effect), {
      onSuccess: (value) => value,
      onFailure: (cause) => fallback(Cause.squash(cause)),
    }),
);

const envOf = (name: string): Option.Option<string> =>
  runOrElse(Config.option(Config.NonEmptyString(name)), () => Option.none()).pipe(
    Option.map((value) => Str.trim(value)),
    Option.filter(Str.isNonEmpty),
  );

const envNameOf: {
  (name: string): (env: Readonly<Record<string, string>>) => string;
  (env: Readonly<Record<string, string>>, name: string): string;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (env: Readonly<Record<string, string>>, name: string): string => env[name] ?? name,
);

const failsInCi = (options: ResolvedOptions): boolean =>
  options.ci === "fail" && Option.isSome(envOf("CI"));

const warned = new Set<string>();

const warnOnce: {
  (message: string): (reason: string) => void;
  (reason: string, message: string): void;
} = Fn.dual(DATA_FIRST_ARITY, (reason: string, message: string): void => {
  if (warned.has(reason)) {
    return;
  }
  warned.add(reason);
  Effect.runFork(Console.warn(`${PREFIX}: ${message}`));
});

const messageOf = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export { envNameOf, envOf, failsInCi, messageOf, nowMs, runOrElse, toJson, warnOnce };
