import { DateTime, Option, String as Str, pipe } from "effect";

const DATE_PARTS = /^(?<year>\d{4})[/.\-年](?<month>\d{1,2})[/.\-月](?<day>\d{1,2})日?$/u;

const COMPACT_DATE = /^(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})$/u;

const INTEGER = /^-?\d+$/u;

const MINUS_MARK = /^[▲△]/u;

const NOISE = /[\s,¥\\円]/gu;

const PART_WIDTH = 2;

const DECIMAL = 10;

const NEGATIVE = -1;

const POSITIVE = 1;

const ZERO = 0;

const clean = (cell: string): string => pipe(cell, Str.normalize("NFKC"), Str.trim);

const groupsOf = (cell: string): Option.Option<Readonly<Record<string, string>>> =>
  pipe(
    Str.match(DATE_PARTS)(cell),
    Option.orElse(() => Str.match(COMPACT_DATE)(cell)),
    Option.flatMapNullishOr(({ groups }) => groups),
  );

const isoOf = (groups: Readonly<Record<string, string>>): string => {
  const part = (name: string): string => pipe(groups[name] ?? "", Str.padStart(PART_WIDTH, "0"));
  return `${groups["year"] ?? ""}-${part("month")}-${part("day")}`;
};

const dateOf = (cell: string): Option.Option<string> =>
  pipe(
    groupsOf(cell),
    Option.map(isoOf),
    Option.filter((iso) =>
      pipe(DateTime.make(iso), Option.map(DateTime.formatIsoDateUtc), Option.contains(iso)),
    ),
  );

const signOf = (cell: string): number =>
  Option.match(Str.match(MINUS_MARK)(cell), { onNone: () => POSITIVE, onSome: () => NEGATIVE });

const amountOf = (cell: string): Option.Option<number> =>
  pipe(
    cell,
    Str.replace(MINUS_MARK, ""),
    Str.replaceAll(NOISE, ""),
    Option.liftPredicate((digits: string) => INTEGER.test(digits)),
    Option.map((digits) => Number.parseInt(digits, DECIMAL) * signOf(cell)),
  );

const optionalAmountOf = (cell: string): Option.Option<number> =>
  Option.match(Option.liftPredicate(cell, Str.isNonEmpty), {
    onNone: () => Option.some(ZERO),
    onSome: amountOf,
  });

export { amountOf, clean, dateOf, optionalAmountOf };
