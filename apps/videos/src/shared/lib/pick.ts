import { Option, Record as Rec } from "effect";

export const pick = (
  record: Readonly<Record<string, string>>,
  key: string,
  fallback: string,
): string => Option.getOrElse(Rec.get(record, key), () => fallback);
