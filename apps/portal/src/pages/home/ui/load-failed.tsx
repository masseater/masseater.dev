import type { ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { messageOf } from "#/shared/model";

const FAILED = "読み込めませんでした";

export const LoadFailed = ({ error }: Readonly<Pick<ErrorComponentProps, "error">>): ReactNode => (
  <div className="bg-card rounded-xl border p-5 text-sm" role="alert">
    <p className="font-bold">{FAILED}</p>
    <p className="text-muted-foreground break-words">{messageOf(error)}</p>
  </div>
);
