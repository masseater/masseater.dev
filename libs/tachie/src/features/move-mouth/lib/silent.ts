import { Option, pipe } from "effect";

export const silentMouth = (mouth: Readonly<{ closed: string; alwaysApply?: boolean }>): string =>
  pipe(
    Option.some(mouth.closed),
    Option.filter(() => mouth.alwaysApply === true),
    Option.getOrElse(() => ""),
  );
