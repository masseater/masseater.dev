import { Array as Arr, Record as Rec, pipe } from "effect";

export const workletIn = (found: Readonly<Record<string, string>>): string =>
  pipe(Rec.values(found), Arr.join(""));
