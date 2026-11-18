import { Array as Arr, Option, String as Str, pipe } from "effect";

const WINDOWS = "win32";
const SEPARATOR = "-";

export const targetOf =
  (targets: readonly string[]) =>
  (platform: string, arch: string): Option.Option<string> =>
    Arr.findFirst(targets, Str.startsWith(`${platform}${SEPARATOR}${arch}${SEPARATOR}`));

export const executableOf =
  (binary: string) =>
  (platform: string): string =>
    pipe(
      Option.liftPredicate(platform, (found) => found === WINDOWS),
      Option.match({ onNone: () => binary, onSome: () => `${binary}.exe` }),
    );
