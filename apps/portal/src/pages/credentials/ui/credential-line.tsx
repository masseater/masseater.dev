import type { CredentialState } from "@masseater.dev/portal-protocol";
import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

const ACTIONS: Readonly<
  Record<CredentialState["kind"], Readonly<Record<CredentialState["status"], string>>>
> = {
  key: { stored: "登録し直す", missing: "登録する" },
  login: { stored: "ログインし直す", missing: "ログインする" },
};

export const CredentialLine = ({ state }: Readonly<{ state: CredentialState }>): ReactNode => (
  <div className="flex items-baseline justify-between gap-4">
    <p className="min-w-0 font-mono text-sm break-all">{state.id}</p>
    <a
      className={cn(
        "stage-link shrink-0 text-xs",
        state.status === "missing" && "text-destructive",
      )}
      href={state.actionUrl}
    >
      {ACTIONS[state.kind][state.status]}
    </a>
  </div>
);
