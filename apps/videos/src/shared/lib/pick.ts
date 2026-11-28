import { Function as Fn, Option, Record as Rec } from "effect";

const ARITY = 3;

type Table = Readonly<Record<string, string>>;

export const pick: {
  (key: string, fallback: string): (record: Table) => string;
  (record: Table, key: string, fallback: string): string;
} = Fn.dual(ARITY, (record: Table, key: string, fallback: string): string =>
  Option.getOrElse(Rec.get(record, key), () => fallback),
);
