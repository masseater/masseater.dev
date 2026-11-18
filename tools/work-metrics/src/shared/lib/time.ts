import { DateTime } from "effect";

export const millis = (iso: string): number => DateTime.toEpochMillis(DateTime.makeUnsafe(iso));
