import { Array as Arr, Option, Record as Rec } from "effect";

import type { Entry } from "./mapping.ts";
import { unexpectedKey } from "./sequence.ts";
import type { Sink } from "./sink.ts";

export type Handler<State> = (state: State, entry: Entry) => State;

export type Handlers<State> = readonly (readonly [string, Handler<State>])[];

export interface FoldInput<State> {
  readonly entries: readonly Entry[];
  readonly initial: State;
  readonly handlers: Handlers<State>;
  readonly unknown: Handler<State>;
}

export const foldEntries = <State>(input: FoldInput<State>): State => {
  const table = Rec.fromEntries(input.handlers);
  return Arr.reduce(input.entries, input.initial, (state, entry) =>
    Option.getOrElse(Rec.get(table, entry.id), () => input.unknown)(state, entry),
  );
};

export interface RejectInput {
  readonly sink: Sink;
  readonly section: string;
  readonly expected: readonly string[];
}

export const rejecting =
  <State>(input: RejectInput): Handler<State> =>
  (state, entry) => {
    unexpectedKey(input.sink)({ key: entry.key, section: input.section, expected: input.expected });
    return state;
  };

export interface Setters<State> {
  readonly set: <Key extends keyof State>(
    key: Key,
    parse: (entry: Entry) => State[Key],
  ) => Handler<State>;
  readonly setSome: <Key extends keyof State>(
    key: Key,
    parse: (entry: Entry) => Option.Option<NonNullable<State[Key]>>,
  ) => Handler<State>;
}

export const setters = <State>(): Setters<State> => ({
  set: (key, parse) => (state, entry) => ({ ...state, [key]: parse(entry) }),
  setSome: (key, parse) => (state, entry) =>
    Option.match(parse(entry), {
      onNone: () => state,
      onSome: (value): State => ({ ...state, [key]: value }),
    }),
});

export const keep = <State>(state: State): State => state;
