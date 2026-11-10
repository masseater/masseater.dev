import { Function as Fn, Option, String as Str } from "effect";

const DATA_FIRST_ARITY_3 = 3;
const START = 0;

const indexFrom: {
  (search: string, from: number): (text: string) => Option.Option<number>;
  (text: string, search: string, from: number): Option.Option<number>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (text: string, search: string, from: number): Option.Option<number> =>
    Option.map(Str.indexOf(search)(Str.slice(from)(text)), (found) => found + from),
);

const lastIndexUpTo: {
  (search: string, position: number): (text: string) => Option.Option<number>;
  (text: string, search: string, position: number): Option.Option<number>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (text: string, search: string, position: number): Option.Option<number> =>
    Str.lastIndexOf(search)(Str.slice(START, Math.max(position, START) + search.length)(text)),
);

export { indexFrom, lastIndexUpTo };
