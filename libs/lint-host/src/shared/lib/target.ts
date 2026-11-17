import { Match } from "effect";

const abiOf = (platform: string): string =>
  Match.value(platform).pipe(
    Match.when("linux", () => "-gnu"),
    Match.when("win32", () => "-msvc"),
    Match.orElse(() => ""),
  );

export const platformTarget = `${process.platform}-${process.arch}${abiOf(process.platform)}`;

export const addonFileOf = (binary: string): string => `${binary}.${platformTarget}.node`;
