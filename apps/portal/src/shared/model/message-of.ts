import { Predicate } from "effect";

export const messageOf = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (Predicate.hasProperty(error, "text") && Predicate.isString(error.text)) {
    return error.text;
  }
  return String(error);
};
