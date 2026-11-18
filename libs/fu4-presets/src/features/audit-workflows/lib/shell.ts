import { Array as Arr, Option, String as Str, pipe } from "effect";

export const normalizeShell = (shell: string): string => {
  const head = Option.getOrElse(Arr.head(Str.split(" ")(shell)), () => shell);
  return pipe(
    Str.split("/")(head),
    Arr.last,
    Option.filter(Str.isNonEmpty),
    Option.getOrElse(() => head),
  );
};
