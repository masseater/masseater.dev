import { Schema } from "effect";

const ACCOUNT_CLASSES = [
  "current-asset",
  "fixed-asset",
  "current-liability",
  "fixed-liability",
] as const;

const AccountClass = Schema.Literals(ACCOUNT_CLASSES);

type AccountClass = typeof AccountClass.Type;

export { ACCOUNT_CLASSES, AccountClass };
