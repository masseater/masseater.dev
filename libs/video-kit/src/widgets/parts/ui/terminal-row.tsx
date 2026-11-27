import { String as Str } from "effect";
import type { ReactNode } from "react";

const PROMPT = "$ ";
const BLANK = " ";

const visibilityOf = (shown: boolean): string => {
  if (shown) {
    return "";
  }
  return "invisible";
};

const outputOf = (row: string): string => {
  if (Str.isEmpty(row)) {
    return BLANK;
  }
  return row;
};

export const TerminalRow = ({
  row,
  shown,
}: Readonly<{ row: string; shown: boolean }>): ReactNode => {
  if (Str.startsWith(PROMPT)(row)) {
    return (
      <div className={`text-code-ink whitespace-pre-wrap ${visibilityOf(shown)}`}>
        <span className="text-code-prompt">{PROMPT}</span>
        {Str.slice(PROMPT.length)(row)}
      </div>
    );
  }
  return (
    <div className={`text-code-output whitespace-pre-wrap ${visibilityOf(shown)}`}>
      {outputOf(row)}
    </div>
  );
};
