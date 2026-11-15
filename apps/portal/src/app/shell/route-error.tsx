import type { ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

const RETRY = "もう一度読む";

const messageOf = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const RouteError = ({
  error,
  reset,
}: Readonly<Pick<ErrorComponentProps, "error" | "reset">>): ReactNode => (
  <div className="flex flex-col items-start gap-4" role="alert">
    <p className="text-foreground/80 text-sm break-words whitespace-pre-wrap">{messageOf(error)}</p>
    <button className="stage-link" onClick={reset} type="button">
      {RETRY}
    </button>
  </div>
);
