import { Schema } from "effect";

const ACCOUNT_CLASSES = [
  "current-asset",
  "fixed-asset",
  "current-liability",
  "fixed-liability",
] as const;

const AccountClassSchema = Schema.Literals(ACCOUNT_CLASSES);

type AccountClass = typeof AccountClassSchema.Type;

const DIRECTIONS: Readonly<Record<AccountClass, number>> = {
  "current-asset": 1,
  "fixed-asset": 1,
  "current-liability": -1,
  "fixed-liability": -1,
};

const directionOf = (accountClass: AccountClass): number => DIRECTIONS[accountClass];

export { ACCOUNT_CLASSES, AccountClassSchema, directionOf };
export type { AccountClass };
