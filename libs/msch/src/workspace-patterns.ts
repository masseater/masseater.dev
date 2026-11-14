import { String as Str } from "effect";

const SEPARATOR = "/";
const NEGATION = "!";
const RELATIVE = "./";

const withoutRelative = (target: string): string => {
  if (Str.startsWith(RELATIVE)(target)) {
    return Str.slice(RELATIVE.length)(target);
  }
  return target;
};

const prefixed =
  (directory: string) =>
  (pattern: string): string => {
    if (Str.startsWith(NEGATION)(pattern)) {
      return `${NEGATION}${directory}${SEPARATOR}${Str.slice(NEGATION.length)(pattern)}`;
    }
    return `${directory}${SEPARATOR}${withoutRelative(pattern)}`;
  };

export { prefixed, withoutRelative };
