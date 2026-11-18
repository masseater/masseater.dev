import { Option, String as Str } from "effect";

const OPEN = "${{";
const CLOSE = "}}";
const SINGLE = 2;

export const containsExpression = (text: string): boolean =>
  Option.match(Option.all([Str.indexOf(OPEN)(text), Str.indexOf(CLOSE)(text)]), {
    onNone: () => false,
    onSome: ([open, close]) => open < close,
  });

export const isExpressionAssigned = (text: string): boolean => {
  const trimmed = Str.trim(text);
  return (
    Str.startsWith(OPEN)(trimmed) &&
    Str.endsWith(CLOSE)(trimmed) &&
    Str.split(OPEN)(trimmed).length === SINGLE
  );
};
