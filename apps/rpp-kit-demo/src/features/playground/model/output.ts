import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Schema } from "effect";
import { Atom } from "effect/reactivity";

export const LineSchema = Schema.Struct({
  kind: Schema.Literals(["log", "warn", "error", "type"]),
  text: Schema.String,
});

export type Line = typeof LineSchema.Type;

export type Entry = Readonly<Line & { id: number }>;

export type Output =
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "ran"; entries: readonly Entry[] }>;

export type Report = (output: Output) => void;

const outputAtom = Atom.make<Output>({ status: "pending" }).pipe(Atom.keepAlive);

export const useOutput = (): Output => useAtomValue(outputAtom);

export const useReport = (): Report => useAtomSet(outputAtom);
