import { Schema } from "effect";

export const ACCOUNT_CLASSES = [
  "current-asset",
  "fixed-asset",
  "current-liability",
  "fixed-liability",
] as const;

export const AccountClassSchema = Schema.Literals(ACCOUNT_CLASSES);

export type AccountClass = typeof AccountClassSchema.Type;

const DIRECTIONS: Readonly<Record<AccountClass, number>> = {
  "current-asset": 1,
  "fixed-asset": 1,
  "current-liability": -1,
  "fixed-liability": -1,
};

export const directionOf = (accountClass: AccountClass): number => DIRECTIONS[accountClass];
