import { Duration } from "effect";

export const RETRY = {
  firstMillis: 1000,
  longestMillis: Duration.toMillis(Duration.fromInputUnsafe("10 minutes")),
  doublings: 10,
} as const;
