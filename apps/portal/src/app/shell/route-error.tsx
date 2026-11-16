import { Button } from "@masseater.dev/ui/button";
import type { ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { messageOf } from "#/shared/model/index.ts";

const RETRY = "もう一度読む";

export const RouteError = ({
  error,
  reset,
}: Readonly<Pick<ErrorComponentProps, "error" | "reset">>): ReactNode => (
  <div
    className="border-destructive bg-destructive-soft flex flex-col items-start gap-4 rounded-xl border p-5"
    role="alert"
  >
    <p className="text-sm break-words whitespace-pre-wrap">{messageOf(error)}</p>
    <Button onClick={reset} variant="outline">
      {RETRY}
    </Button>
  </div>
);
