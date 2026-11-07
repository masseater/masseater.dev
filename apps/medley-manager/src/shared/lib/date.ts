import { DateTime, Option } from "effect";

const formatDate = (value: string | null): Option.Option<string> =>
  Option.fromNullOr(value).pipe(
    Option.flatMap((input) => DateTime.make(input)),
    Option.map(DateTime.toPartsUtc),
    Option.map(
      (parts) => `${parts.year.toString()}年${parts.month.toString()}月${parts.day.toString()}日`,
    ),
  );

export { formatDate };
