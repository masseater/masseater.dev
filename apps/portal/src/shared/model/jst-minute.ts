import { DateTime, Option, String as Str, pipe } from "effect";

const START = 0;

const MINUTE_END = 16;

const JST = { hours: 9 } as const;

const jstMinute = (iso: string): string =>
  pipe(
    DateTime.make(iso),
    Option.map((time) =>
      pipe(
        time,
        DateTime.add(JST),
        DateTime.formatIso,
        Str.slice(START, MINUTE_END),
        Str.replace("T", " "),
      ),
    ),
    Option.getOrElse(() => iso),
  );

export { jstMinute };
